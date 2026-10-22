import { LIMITS, type ImageInfo } from "../domain/model";
import { uploadSchema } from "./validation";
import type { PdfSource } from "./pdf-template";

export interface LocalImage extends ImageInfo {
  bytes: Uint8Array<ArrayBuffer>;
  mime: "image/png" | "image/jpeg";
  url: string;
  name: string;
  pdf?: PdfSource;
}
export function inspectImage(
  bytes: Uint8Array,
): ImageInfo & { mime: "image/png" | "image/jpeg" } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    bytes.length >= 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v) &&
    String.fromCharCode(...bytes.subarray(12, 16)) === "IHDR"
  ) {
    return {
      width: view.getUint32(16),
      height: view.getUint32(20),
      mime: "image/png",
    };
  }
  if (bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 255) break;
      const marker = bytes[offset + 1];
      if (marker === 255) {
        offset++;
        continue;
      }
      if (marker === 218 || marker === 217) break;
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + length + 2 > bytes.length) break;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        length >= 7
      )
        return {
          width: view.getUint16(offset + 7),
          height: view.getUint16(offset + 5),
          mime: "image/jpeg",
        };
      offset += length + 2;
    }
  }
  throw new Error("El archivo no contiene una imagen PNG o JPEG válida.");
}
export function checkDimensions(info: ImageInfo) {
  if (
    info.width < 1 ||
    info.height < 1 ||
    info.width > LIMITS.imageSide ||
    info.height > LIMITS.imageSide ||
    info.width * info.height > LIMITS.imagePixels
  )
    throw new Error(
      "La imagen supera 20 megapíxeles o 10000 píxeles por lado. Reduce su tamaño.",
    );
}
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error(
          "No se puede decodificar la imagen. Comprueba que el archivo no esté corrupto.",
        ),
      );
    image.src = url;
  });
}
export async function readLocalImage(
  file: File,
  page = 1,
): Promise<LocalImage> {
  const parsed = uploadSchema.safeParse({ size: file.size, type: file.type });
  if (!parsed.success)
    throw new Error("Selecciona un PNG, JPEG o PDF de hasta 20 MiB.");
  if (file.type === "application/pdf") {
    const { readLocalPdf } = await import("./pdf-template");
    return readLocalPdf(file, page);
  }
  const original = new Uint8Array(await file.arrayBuffer());
  const header = inspectImage(original);
  checkDimensions(header);
  if (header.mime !== file.type)
    throw new Error(
      "El contenido del archivo no coincide con su formato declarado.",
    );
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(sourceUrl);
    const width = image.naturalWidth,
      height = image.naturalHeight;
    checkDimensions({ width, height });
    const hasExif =
      header.mime === "image/png"
        ? original.some(
            (value, i) =>
              value === 101 &&
              original[i + 1] === 88 &&
              original[i + 2] === 73 &&
              original[i + 3] === 102,
          )
        : original.some(
            (value, i) =>
              value === 69 &&
              original[i + 1] === 120 &&
              original[i + 2] === 105 &&
              original[i + 3] === 102 &&
              original[i + 4] === 0 &&
              original[i + 5] === 0,
          );
    if (!hasExif) {
      return {
        width,
        height,
        bytes: original,
        mime: header.mime,
        url: URL.createObjectURL(file),
        name: file.name,
      };
    }
    // Browser decoding applies EXIF orientation. Normalize once, so PDF and PNG use identical pixels.
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx)
        throw new Error("No se puede preparar la imagen en este navegador.");
      ctx.drawImage(image, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b
              ? resolve(b)
              : reject(new Error("No se pudo preparar la imagen.")),
          "image/png",
        ),
      );
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (bytes.byteLength > LIMITS.outputBytes / 2)
        throw new Error(
          "La imagen requiere demasiada memoria. Reduce su resolución.",
        );
      return {
        width,
        height,
        bytes,
        mime: "image/png",
        url: URL.createObjectURL(blob),
        name: file.name,
      };
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
export function releaseImage(image?: LocalImage) {
  if (image) URL.revokeObjectURL(image.url);
}
