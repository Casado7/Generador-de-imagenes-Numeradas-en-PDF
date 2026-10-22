import { prepareProject, renderPage } from "../application/compose";
import type {
  ExportPort,
  ExportProgress,
  ExportRequest,
  ExportResult,
} from "../application/ports";
import { planPage } from "../domain/composition";
import type { Face } from "../domain/model";
import { createFontResources, loadCanvasFonts, type FontBytes } from "./fonts";
import type { LocalImage } from "./images";
import { makeRasterizer, type Rasterizer } from "./raster";
import { exportRequestSchema, workerMessageSchema } from "./validation";

export class BrowserExporter implements ExportPort {
  private worker?: Worker;
  private reject?: (reason: Error) => void;
  private fallback?: Rasterizer;
  private active = false;
  constructor(
    private assets: Partial<Record<Face, LocalImage>>,
    private fonts: FontBytes,
  ) {}
  start(
    request: ExportRequest,
    progress: (p: ExportProgress) => void,
  ): Promise<ExportResult> {
    if (this.active)
      return Promise.reject(new Error("Ya hay un trabajo en curso."));
    const parsed = exportRequestSchema.safeParse(request);
    if (!parsed.success)
      return Promise.reject(
        new Error("Revisa la configuración antes de exportar."),
      );
    this.active = true;
    return new Promise((resolve, reject) => {
      this.reject = reject;
      const job = crypto.randomUUID();
      const cleanup = () => {
        this.worker?.terminate();
        this.worker = undefined;
        this.fallback?.dispose();
        this.fallback = undefined;
        this.active = false;
        this.reject = undefined;
      };
      const fail = (error: unknown) => {
        cleanup();
        reject(
          error instanceof Error
            ? error
            : new Error("La exportación no pudo completarse."),
        );
      };
      try {
        this.worker = new Worker(
          new URL("./export.worker.ts", import.meta.url),
        );
        this.worker.onerror = () =>
          fail(
            new Error(
              "No se pudo iniciar la generación local. Recarga la página e inténtalo de nuevo.",
            ),
          );
        this.worker.onmessage = async (event: MessageEvent<unknown>) => {
          const message = workerMessageSchema.safeParse(event.data);
          if (!message.success) {
            fail(new Error("Se recibió una respuesta de generación inválida."));
            return;
          }
          if (message.data.job !== job || !this.active) return;
          const data = message.data;
          if (data.type === "progress") progress(data);
          else if (data.type === "error") fail(new Error(data.message));
          else if (data.type === "result") {
            cleanup();
            resolve({
              bytes: new Uint8Array(data.bytes),
              name: data.name,
              mime: data.mime,
            });
          } else if (data.type === "raster") {
            try {
              if (!this.fallback) {
                await loadCanvasFonts(this.fonts, document.fonts);
                this.fallback = await makeRasterizer(
                  this.assets,
                  false,
                  () => !this.active,
                );
              }
              if (!this.active) {
                this.fallback?.dispose();
                this.fallback = undefined;
                return;
              }
              const resources = await createFontResources(this.fonts);
              const layout = prepareProject(
                request.project,
                request.images,
                resources.metrics,
              );
              const page = renderPage(
                planPage(request.project, request.images, layout, data.page),
                resources.metrics,
              );
              const bytes = await this.fallback.render(page, request.dpi);
              if (this.active)
                this.worker?.postMessage(
                  { type: "raster-result", job, page: data.page, bytes },
                  [bytes.buffer],
                );
            } catch (error) {
              if (this.active) fail(error);
            }
          }
        };
        const assets = Object.fromEntries(
          Object.entries(this.assets).map(([face, asset]) => [
            face,
            { bytes: asset.bytes, mime: asset.mime, pdf: asset.pdf },
          ]),
        );
        this.worker.postMessage({
          type: "start",
          job,
          request: parsed.data,
          assets,
          fonts: this.fonts,
          offscreen: typeof OffscreenCanvas !== "undefined",
        });
      } catch (error) {
        fail(error);
      }
    });
  }
  cancel() {
    this.active = false;
    this.worker?.terminate();
    this.worker = undefined;
    this.fallback?.dispose();
    this.fallback = undefined;
    this.reject?.(new DOMException("Generación cancelada.", "AbortError"));
    this.reject = undefined;
  }
}
export function downloadResult(result: ExportResult) {
  const url = URL.createObjectURL(
    new Blob([result.bytes], { type: result.mime }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = result.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
