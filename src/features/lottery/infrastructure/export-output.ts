import {
  PDFDocument,
  rgb,
  degrees,
  type PDFImage,
  type PDFEmbeddedPage,
} from "pdf-lib";
import { embedPdfTemplate, type PdfSource } from "./pdf-template";
import { zipSync } from "fflate";
import { prepareProject, renderPage } from "../application/compose";
import type {
  ExportProgress,
  ExportRequest,
  ExportResult,
  RenderPage,
} from "../application/ports";
import { planPage } from "../domain/composition";
import { LIMITS, mmToPt, type Face } from "../domain/model";
import { embedFonts, fontMetrics, type FontBytes } from "./fonts";
import { assertRasterSize } from "./raster";

export type ExportAssets = Partial<
  Record<
    Face,
    {
      bytes: Uint8Array<ArrayBuffer>;
      mime: "image/png" | "image/jpeg";
      pdf?: PdfSource;
    }
  >
>;
export async function generateOutput(
  request: ExportRequest,
  assets: ExportAssets,
  fontBytes: FontBytes,
  progress: (p: ExportProgress) => void,
  raster?: (page: RenderPage, dpi: number) => Promise<Uint8Array<ArrayBuffer>>,
): Promise<ExportResult> {
  const doc = await PDFDocument.create();
  doc.setProducer("Rifa Estudio");
  doc.setTitle("Boletos numerados");
  const fonts = await embedFonts(doc, fontBytes),
    metrics = fontMetrics(fonts);
  const layout = prepareProject(request.project, request.images, metrics);
  if (request.format !== "pdf")
    assertRasterSize(layout.width, layout.height, request.dpi);
  progress({ stage: "preparing", done: 0, total: layout.pages });
  const images: Partial<Record<Face, PDFImage | PDFEmbeddedPage>> = {};
  if (request.format !== "images")
    for (const face of ["front", "back"] as const) {
      const asset = assets[face];
      if (asset)
        images[face] = asset.pdf
          ? await embedPdfTemplate(doc, asset.pdf)
          : asset.mime === "image/png"
            ? await doc.embedPng(asset.bytes)
            : await doc.embedJpg(asset.bytes);
    }
  const files: Record<string, Uint8Array> = {};
  let totalBytes = 0;
  function account(bytes: Uint8Array) {
    totalBytes += bytes.byteLength;
    if (totalBytes > LIMITS.outputBytes)
      throw new Error(
        "El resultado supera 128 MiB. Reduce el rango o la resolución y vuelve a intentarlo.",
      );
  }
  for (let index = 0; index < layout.pages; index++) {
    const page = renderPage(
      planPage(request.project, request.images, layout, index),
      metrics,
    );
    if (request.format !== "images") {
      const pdfPage = doc.addPage([mmToPt(page.width), mmToPt(page.height)]);
      const image = images[page.face];
      if (!image) throw new Error("Falta una imagen de la exportación.");
      for (const card of page.cards) {
        const placement = {
          x: mmToPt(card.image.x),
          y: mmToPt(page.height - card.image.y - card.image.height),
          width: mmToPt(card.image.width),
          height: mmToPt(card.image.height),
        };
        if (assets[page.face]?.pdf)
          pdfPage.drawPage(image as PDFEmbeddedPage, placement);
        else pdfPage.drawImage(image as PDFImage, placement);
        for (const cover of card.covers) {
          const color = [1, 3, 5].map(
            (i) => parseInt(cover.color.slice(i, i + 2), 16) / 255,
          );
          pdfPage.drawRectangle({
            x: mmToPt(cover.x),
            y: mmToPt(page.height - cover.y - cover.height),
            width: mmToPt(cover.width),
            height: mmToPt(cover.height),
            color: rgb(color[0], color[1], color[2]),
          });
        }
        for (const run of card.runs) {
          const color = [1, 3, 5].map(
            (i) => parseInt(run.color.slice(i, i + 2), 16) / 255,
          );
          pdfPage.drawText(run.text, {
            x: mmToPt(run.originX),
            y: mmToPt(page.height - run.originY),
            rotate: degrees(-run.rotation),
            size: run.size,
            font: fonts[run.font],
            color: rgb(color[0], color[1], color[2]),
          });
        }
      }
    }
    if (request.format !== "pdf") {
      if (!raster)
        throw new Error("No se ha podido iniciar la exportación de imágenes.");
      const bytes = await raster(page, request.dpi);
      account(bytes);
      const face = page.face === "front" ? "frente" : "reverso";
      files[`hojas/${String(index + 1).padStart(4, "0")}-${face}.png`] = bytes;
    }
    progress({ stage: "pages", done: index + 1, total: layout.pages });
  }
  progress({ stage: "packing", done: layout.pages, total: layout.pages });
  const stem = `boletos-${request.project.sequence.start}-${request.project.sequence.end}`;
  if (request.format !== "images") {
    const bytes = new Uint8Array(await doc.save());
    account(bytes);
    if (request.format === "pdf")
      return { bytes, name: `${stem}.pdf`, mime: "application/pdf" };
    files[`${stem}.pdf`] = bytes;
  }
  const bytes = new Uint8Array(zipSync(files, { level: 0 }));
  if (bytes.byteLength > LIMITS.outputBytes)
    throw new Error(
      "El ZIP supera 128 MiB. Reduce el rango o usa menos resolución.",
    );
  return { bytes, name: `${stem}.zip`, mime: "application/zip" };
}
