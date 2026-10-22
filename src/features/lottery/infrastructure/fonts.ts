import { PDFDocument, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { FontMetrics } from "../application/ports";
import { ptToMm, type FontId } from "../domain/model";

export const FONT_FILES: Record<FontId, string> = {
  sans: "/fonts/NotoSans-Regular.ttf",
  mono: "/fonts/NotoSansMono-Regular.ttf",
};
export const FONT_FAMILIES: Record<FontId, string> = {
  sans: "Noto Sans",
  mono: "Noto Sans Mono",
};
export type FontBytes = Record<FontId, Uint8Array<ArrayBuffer>>;
export async function loadFontBytes(): Promise<FontBytes> {
  const entries = await Promise.all(
    (Object.keys(FONT_FILES) as FontId[]).map(async (id) => {
      const response = await fetch(FONT_FILES[id]);
      if (!response.ok)
        throw new Error("No se pudieron cargar las fuentes locales.");
      return [id, new Uint8Array(await response.arrayBuffer())] as const;
    }),
  );
  return Object.fromEntries(entries) as FontBytes;
}
export async function embedFonts(doc: PDFDocument, bytes: FontBytes) {
  doc.registerFontkit(fontkit);
  return {
    sans: await doc.embedFont(bytes.sans, { subset: true }),
    mono: await doc.embedFont(bytes.mono, { subset: true }),
  };
}
export function fontMetrics(fonts: Record<FontId, PDFFont>): FontMetrics {
  const cache = new Map<string, ReturnType<FontMetrics["measure"]>>();
  const supported = {
    sans: new Set(fonts.sans.getCharacterSet()),
    mono: new Set(fonts.mono.getCharacterSet()),
  };
  return {
    measure(text, id, size) {
      const key = JSON.stringify([text, id, size]);
      const existing = cache.get(key);
      if (existing) return existing;
      const font = fonts[id];
      for (const ch of text)
        if (!supported[id].has(ch.codePointAt(0)!))
          throw new Error(
            `La fuente no admite el carácter «${ch}». Cambia el texto.`,
          );
      const ascent = font.heightAtSize(size, { descender: false });
      const height = font.heightAtSize(size);
      const value = {
        width: ptToMm(font.widthOfTextAtSize(text, size)),
        ascent: ptToMm(ascent),
        descent: ptToMm(height - ascent),
      };
      if (cache.size > 25000) cache.clear();
      cache.set(key, value);
      return value;
    },
  };
}
export async function createFontResources(bytes?: FontBytes) {
  const data = bytes ?? (await loadFontBytes());
  const doc = await PDFDocument.create();
  return { bytes: data, metrics: fontMetrics(await embedFonts(doc, data)) };
}
export async function loadCanvasFonts(bytes: FontBytes, target: FontFaceSet) {
  await Promise.all(
    (Object.keys(bytes) as FontId[]).map(async (id) => {
      const font = new FontFace(FONT_FAMILIES[id], bytes[id].buffer);
      await font.load();
      target.add(font);
    }),
  );
}
