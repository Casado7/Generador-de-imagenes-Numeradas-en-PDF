import type { RenderPage } from "../application/ports";
import { LIMITS, mmToPx, mmToPt, type Face } from "../domain/model";
import { FONT_FAMILIES } from "./fonts";

export interface Rasterizer {
  render(page: RenderPage, dpi: number): Promise<Uint8Array<ArrayBuffer>>;
  dispose(): void;
}
export async function makeRasterizer(
  assets: Partial<
    Record<Face, { bytes: Uint8Array<ArrayBuffer>; mime: string }>
  >,
  offscreen: boolean,
  cancelled: () => boolean = () => false,
): Promise<Rasterizer> {
  const decoded: Partial<Record<Face, ImageBitmap | HTMLImageElement>> = {};
  const urls: string[] = [];
  try {
    for (const face of ["front", "back"] as const) {
      const asset = assets[face];
      if (!asset) continue;
      const blob = new Blob([asset.bytes], { type: asset.mime });
      if (offscreen) decoded[face] = await createImageBitmap(blob);
      else {
        const url = URL.createObjectURL(blob);
        urls.push(url);
        decoded[face] = await new Promise<HTMLImageElement>(
          (resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () =>
              reject(new Error("No se pudo preparar la imagen para imprimir."));
            image.src = url;
          },
        );
      }
    }
  } catch (error) {
    for (const image of Object.values(decoded))
      if ("close" in image) image.close();
    urls.forEach((url) => URL.revokeObjectURL(url));
    throw error;
  }
  return {
    async render(page, dpi) {
      const width = mmToPx(page.width, dpi),
        height = mmToPx(page.height, dpi);
      if (width * height > LIMITS.rasterPixels)
        throw new Error(
          "La hoja supera 32 megapíxeles. Reduce el papel o usa 150 ppp.",
        );
      const canvas = offscreen
        ? new OffscreenCanvas(width, height)
        : document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      try {
        const ctx = canvas.getContext("2d") as
          CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
        if (!ctx) throw new Error("No se pudo crear la hoja como imagen.");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        const scale = dpi / 25.4;
        ctx.scale(scale, scale);
        for (const card of page.cards) {
          if (cancelled()) throw new DOMException("Cancelado", "AbortError");
          const image = decoded[page.face];
          if (!image) throw new Error("Falta una imagen para imprimir.");
          ctx.drawImage(
            image,
            card.image.x,
            card.image.y,
            card.image.width,
            card.image.height,
          );
          for (const cover of card.covers) {
            ctx.fillStyle = cover.color;
            ctx.fillRect(cover.x, cover.y, cover.width, cover.height);
          }
          for (const run of card.runs) {
            ctx.save();
            ctx.translate(run.cx, run.cy);
            ctx.rotate((run.rotation * Math.PI) / 180);
            ctx.font = `${(run.size * 25.4) / 72}px "${FONT_FAMILIES[run.font]}"`;
            ctx.fillStyle = run.color;
            ctx.textBaseline = "alphabetic";
            ctx.fillText(run.text, run.x - run.cx, run.baseline - run.cy);
            ctx.restore();
          }
          if (!offscreen)
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        const blob = offscreen
          ? await (canvas as OffscreenCanvas).convertToBlob({
              type: "image/png",
            })
          : await new Promise<Blob>((resolve, reject) =>
              (canvas as HTMLCanvasElement).toBlob(
                (b) =>
                  b
                    ? resolve(b)
                    : reject(new Error("No se pudo convertir la hoja a PNG.")),
                "image/png",
              ),
            );
        return new Uint8Array(await blob.arrayBuffer());
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    },
    dispose() {
      for (const image of Object.values(decoded))
        if ("close" in image) image.close();
      urls.forEach((url) => URL.revokeObjectURL(url));
    },
  };
}
export function assertRasterSize(width: number, height: number, dpi: number) {
  if (mmToPx(width, dpi) * mmToPx(height, dpi) > LIMITS.rasterPixels)
    throw new Error(
      "La hoja supera 32 megapíxeles. Reduce el papel o usa 150 ppp.",
    );
}
export { mmToPt };
