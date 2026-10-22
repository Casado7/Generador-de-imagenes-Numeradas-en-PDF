import {
  PDFDocument,
  PDFName,
  PDFNumber,
  degrees,
  rgb,
  type PDFPage,
} from "pdf-lib";
import { LIMITS } from "../domain/model";
import type { LocalImage } from "./images";

export interface PdfSource {
  bytes: Uint8Array<ArrayBuffer>;
  page: number;
  pages: number;
}

export async function readLocalPdf(
  file: File,
  pageNumber = 1,
): Promise<LocalImage> {
  const original = new Uint8Array(await file.arrayBuffer());
  if (!new TextDecoder().decode(original.subarray(0, 1024)).includes("%PDF-"))
    throw new Error("El archivo no contiene un PDF válido.");
  let source: PDFDocument;
  let pages: number;
  try {
    source = await PDFDocument.load(original, { updateMetadata: false });
    pages = source.getPageCount();
  } catch (error) {
    if (error instanceof Error && /encrypt/i.test(error.message))
      throw new Error(
        "El PDF está protegido por contraseña. Selecciona una copia sin protección.",
      );
    throw new Error("No se puede leer el PDF. Comprueba que no esté corrupto.");
  }
  if (pages > LIMITS.pdfPages)
    throw new Error(
      "El PDF supera 500 páginas. Selecciona un documento más pequeño.",
    );
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pages)
    throw new Error("Selecciona una página válida del PDF.");
  try {
    pdfGeometry(source.getPage(pageNumber - 1));
  } catch {
    throw new Error("La página del PDF tiene una geometría inválida.");
  }
  const pdfjs = await import("pdfjs-dist");
  const base = new URL(`/pdfjs/${pdfjs.version}/`, window.location.origin).href;
  pdfjs.GlobalWorkerOptions.workerSrc = `${base}pdf.worker.min.mjs`;
  const task = pdfjs.getDocument({
    data: original.slice(),
    cMapUrl: `${base}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${base}standard_fonts/`,
    wasmUrl: `${base}wasm/`,
    iccUrl: `${base}iccs/`,
    useSystemFonts: false,
    enableXfa: false,
  });
  const canvas = document.createElement("canvas");
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(pageNumber);
    const unit = page.getViewport({ scale: 1 });
    if (![unit.width, unit.height].every((n) => Number.isFinite(n) && n > 0))
      throw new Error("La página del PDF tiene un tamaño inválido.");
    const scale = Math.min(
      300 / 72,
      (LIMITS.imageSide - 1) / unit.width,
      (LIMITS.imageSide - 1) / unit.height,
      Math.sqrt((LIMITS.imagePixels - 20_000) / (unit.width * unit.height)),
    );
    const viewport = page.getViewport({ scale });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la vista del PDF.");
    await page.render({
      canvas,
      canvasContext: context,
      viewport,
      annotationMode: pdfjs.AnnotationMode.DISABLE,
    }).promise;
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(new Error("No se pudo preparar la vista del PDF.")),
        "image/png",
      ),
    );
    if (blob.size > LIMITS.outputBytes / 2)
      throw new Error(
        "La página requiere demasiada memoria. Usa un PDF más sencillo.",
      );
    return {
      width: canvas.width,
      height: canvas.height,
      bytes: new Uint8Array(await blob.arrayBuffer()),
      mime: "image/png",
      url: URL.createObjectURL(blob),
      name: file.name,
      pdf: { bytes: original, page: pageNumber, pages },
    };
  } catch (error) {
    if (
      error instanceof Error &&
      /tamaño inválido|memoria|preparar/.test(error.message)
    )
      throw error;
    throw new Error(
      "No se puede mostrar esta página del PDF. Comprueba el archivo o elige otra página.",
    );
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    await task.destroy();
  }
}

function pdfGeometry(page: PDFPage) {
  const crop = page.getCropBox(),
    media = page.getMediaBox();
  const left = Math.max(crop.x, media.x),
    bottom = Math.max(crop.y, media.y);
  const right = Math.min(crop.x + crop.width, media.x + media.width);
  const top = Math.min(crop.y + crop.height, media.y + media.height);
  const unit =
    page.node.lookupMaybe(PDFName.of("UserUnit"), PDFNumber)?.asNumber() ?? 1;
  const width = (right - left) * unit,
    height = (top - bottom) * unit;
  const rotation = ((page.getRotation().angle % 360) + 360) % 360;
  if (
    ![width, height, unit].every((n) => Number.isFinite(n) && n > 0) ||
    ![0, 90, 180, 270].includes(rotation)
  )
    throw new Error("La página del PDF tiene una geometría inválida.");
  return { left, bottom, right, top, width, height, rotation };
}

// Normalize CropBox, UserUnit and /Rotate once so exported art matches PDF.js.
export async function embedPdfTemplate(target: PDFDocument, pdf: PdfSource) {
  const source = await PDFDocument.load(pdf.bytes, { updateMetadata: false });
  const page = source.getPage(pdf.page - 1);
  const { left, bottom, right, top, width, height, rotation } =
    pdfGeometry(page);
  const normalized = await PDFDocument.create();
  const quarter = rotation === 90 || rotation === 270;
  const sheet = normalized.addPage(quarter ? [height, width] : [width, height]);
  sheet.drawRectangle({
    width: sheet.getWidth(),
    height: sheet.getHeight(),
    color: rgb(1, 1, 1),
  });
  if (page.node.Contents()) {
    const art = await normalized.embedPage(page, { left, bottom, right, top });
    sheet.drawPage(art, {
      x: rotation === 180 ? width : rotation === 270 ? height : 0,
      y: rotation === 90 ? width : rotation === 180 ? height : 0,
      width,
      height,
      rotate: degrees(-rotation),
    });
  }
  await normalized.flush();
  return target.embedPage(sheet);
}
