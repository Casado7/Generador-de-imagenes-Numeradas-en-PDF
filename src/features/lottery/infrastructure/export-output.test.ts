import { beforeAll, describe, expect, it } from "vitest";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { unzipSync } from "fflate";
import { DEFAULT_PROJECT, mmToPt } from "../domain/model";
import { generateOutput } from "./export-output";
import { createFontResources, type FontBytes } from "./fonts";
let fonts: FontBytes;
beforeAll(async () => {
  fonts = {
    sans: new Uint8Array(await readFile("public/fonts/NotoSans-Regular.ttf")),
    mono: new Uint8Array(
      await readFile("public/fonts/NotoSansMono-Regular.ttf"),
    ),
  };
});
const png = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  ),
);
describe("exportación", () => {
  it("crea PDF dúplex con medidas y texto para comprobar", async () => {
    const project = structuredClone(DEFAULT_PROJECT);
    project.mode = "duplex";
    project.numbered = "both";
    project.sequence.end = 10;
    project.elements.front.push({
      ...project.elements.front[0],
      id: "title",
      kind: "text",
      text: "Rifa benéfica",
      y: 0.2,
      size: 9,
      font: "mono",
    });
    const images = {
      front: { width: 2, height: 1 },
      back: { width: 2, height: 1 },
    };
    const result = await generateOutput(
      { project, images, format: "pdf", dpi: 150 },
      {
        front: { bytes: png, mime: "image/png" },
        back: { bytes: png, mime: "image/png" },
      },
      fonts,
      () => {},
    );
    const doc = await PDFDocument.load(result.bytes);
    expect(doc.getPageCount()).toBe(4);
    expect(doc.getPages()[0].getWidth()).toBeCloseTo(mmToPt(215.9));
    expect(doc.getPages()[0].getHeight()).toBeCloseTo(mmToPt(279.4));
    await mkdir(".verification", { recursive: true });
    await writeFile(".verification/unit-duplex.pdf", result.bytes);
  });
  it("empaqueta ambos formatos y ordena las hojas", async () => {
    const project = structuredClone(DEFAULT_PROJECT);
    project.sequence.end = 1;
    const result = await generateOutput(
      {
        project,
        images: { front: { width: 2, height: 1 } },
        format: "both",
        dpi: 150,
      },
      { front: { bytes: png, mime: "image/png" } },
      fonts,
      () => {},
      async () => png,
    );
    expect(Object.keys(unzipSync(result.bytes)).sort()).toEqual([
      "boletos-1-1.pdf",
      "hojas/0001-frente.png",
    ]);
  });
  it("mide fuentes locales y rechaza caracteres sin glifo", async () => {
    const { metrics } = await createFontResources(fonts);
    expect(metrics.measure("benéfica 001", "sans", 12).width).toBeGreaterThan(
      0,
    );
    expect(() => metrics.measure("🦄", "mono", 12)).toThrow(/carácter/);
  });
});
