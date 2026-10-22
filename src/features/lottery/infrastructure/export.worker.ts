import { z } from "zod";
import { exportRequestSchema } from "./validation";
import { generateOutput, type ExportAssets } from "./export-output";
import { loadCanvasFonts, type FontBytes } from "./fonts";
import { makeRasterizer, type Rasterizer } from "./raster";
import type { RenderPage } from "../application/ports";

const bytes = z.instanceof(Uint8Array);
const asset = z.object({
  bytes,
  mime: z.enum(["image/png", "image/jpeg"]),
  pdf: z
    .object({
      bytes,
      page: z.number().int().min(1),
      pages: z.number().int().min(1),
    })
    .optional(),
});
const startSchema = z.object({
  type: z.literal("start"),
  job: z.string(),
  request: exportRequestSchema,
  assets: z.object({ front: asset, back: asset.optional() }),
  fonts: z.object({ sans: bytes, mono: bytes }),
  offscreen: z.boolean(),
});
const rasterResponseSchema = z.object({
  type: z.literal("raster-result"),
  job: z.string(),
  page: z.number().int(),
  bytes,
});
let job = "";
let pending:
  | { page: number; resolve: (bytes: Uint8Array<ArrayBuffer>) => void }
  | undefined;
const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = async (event: MessageEvent<unknown>) => {
  const rasterResult = rasterResponseSchema.safeParse(event.data);
  if (rasterResult.success) {
    if (
      rasterResult.data.job === job &&
      pending?.page === rasterResult.data.page
    ) {
      pending.resolve(new Uint8Array(rasterResult.data.bytes));
      pending = undefined;
    }
    return;
  }
  const parsed = startSchema.safeParse(event.data);
  if (!parsed.success || job) return;
  job = parsed.data.job;
  let rasterizer: Rasterizer | undefined;
  try {
    const { request, offscreen } = parsed.data;
    const fonts = parsed.data.fonts as FontBytes,
      assets = parsed.data.assets as ExportAssets;
    let raster:
      | ((page: RenderPage, dpi: number) => Promise<Uint8Array<ArrayBuffer>>)
      | undefined;
    if (request.format !== "pdf") {
      if (
        offscreen &&
        typeof OffscreenCanvas !== "undefined" &&
        typeof FontFace !== "undefined" &&
        scope.fonts
      ) {
        await loadCanvasFonts(fonts, scope.fonts);
        rasterizer = await makeRasterizer(assets, true);
        raster = rasterizer.render;
      } else {
        raster = (page) =>
          new Promise((resolve) => {
            pending = { page: page.index, resolve };
            scope.postMessage({ type: "raster", job, page: page.index });
          });
      }
    }
    const result = await generateOutput(
      request,
      assets,
      fonts,
      (p) => scope.postMessage({ type: "progress", job, ...p }),
      raster,
    );
    scope.postMessage({ type: "result", job, ...result }, [
      result.bytes.buffer,
    ]);
  } catch (error) {
    scope.postMessage({
      type: "error",
      job,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo generar el archivo. Reduce el rango o la resolución.",
    });
  } finally {
    rasterizer?.dispose();
    pending = undefined;
  }
};
