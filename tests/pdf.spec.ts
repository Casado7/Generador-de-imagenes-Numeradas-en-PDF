import { test, expect, type Page } from "@playwright/test";
import { PDFDocument, PDFName, PDFNumber, degrees, rgb } from "pdf-lib";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { unzipSync } from "fflate";

async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function download(page: Page) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: /Generar (PDF|archivos)/ }).click();
  const file = await event;
  return new Uint8Array(await readFile((await file.path())!));
}
async function upload(page: Page, bytes: Uint8Array, name = "plantilla.pdf") {
  await page.getByTestId("image-front").setInputFiles({
    name,
    mimeType: "application/pdf",
    buffer: Buffer.from(bytes),
  });
  await expect(
    page.getByRole("button", { name: "Generar PDF", exact: true }),
  ).toBeEnabled();
}
async function artworkSamples(page: Page) {
  const url = await page
    .getByTestId("ticket-canvas")
    .locator("image")
    .getAttribute("href");
  return page.evaluate(async (url) => {
    const bitmap = await createImageBitmap(await (await fetch(url!)).blob());
    const c = document.createElement("canvas");
    c.width = bitmap.width;
    c.height = bitmap.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    const points = [
      [0.15, 0.15],
      [0.85, 0.15],
      [0.15, 0.85],
      [0.85, 0.85],
    ];
    const colors = points.map(([x, y]) =>
      Array.from(
        ctx.getImageData(
          Math.floor(c.width * x),
          Math.floor(c.height * y),
          1,
          1,
        ).data,
      ),
    );
    bitmap.close();
    return { ratio: c.width / c.height, colors };
  }, url);
}
async function template(rotation: number, userUnit = 1) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 300]);
  page.drawRectangle({ width: 400, height: 300, color: rgb(0, 1, 0) });
  page.drawRectangle({
    x: 100,
    y: 50,
    width: 200,
    height: 100,
    color: rgb(1, 0, 0),
  });
  page.drawRectangle({
    x: 100,
    y: 50,
    width: 100,
    height: 100,
    color: rgb(0, 0, 1),
  });
  page.setCropBox(100, 50, 200, 100);
  page.setRotation(degrees(rotation));
  page.node.set(PDFName.of("UserUnit"), PDFNumber.of(userUnit));
  const other = doc.addPage([300, 300]);
  other.drawRectangle({ width: 300, height: 300, color: rgb(1, 1, 0) });
  return doc.save();
}

test("PDF: páginas, errores recuperables, privacidad y documento vacío", async ({
  page,
}) => {
  const transfers: string[] = [],
    external: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => {
    if (!["GET", "HEAD"].includes(r.method()) || r.postDataBuffer()?.length)
      transfers.push(r.url());
    if (
      /^https?:/.test(r.url()) &&
      new URL(r.url()).origin !==
        new URL(test.info().project.use.baseURL!).origin
    )
      external.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await upload(page, await template(90));
  await expect(
    page.getByRole("combobox", { name: "Página PDF del frente", exact: true }),
  ).toHaveText("Página 1 de 2");
  await choose(page, "Página PDF del frente", "Página 2 de 2");
  await expect(
    page.getByRole("button", { name: "Generar PDF", exact: true }),
  ).toBeEnabled();
  expect((await artworkSamples(page)).ratio).toBeCloseTo(1);
  const previous = await page
    .getByTestId("ticket-canvas")
    .locator("image")
    .getAttribute("href");
  await page.getByTestId("image-front").setInputFiles({
    name: "roto.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\nroto"),
  });
  await expect(page.locator("#image-front-error")).toContainText("corrupto");
  expect(
    await page
      .getByTestId("ticket-canvas")
      .locator("image")
      .getAttribute("href"),
  ).toBe(previous);
  const locked = await PDFDocument.create();
  locked.addPage();
  locked.context.trailerInfo.Encrypt = locked.context.register(
    locked.context.obj({ Filter: "Standard" }),
  );
  await page.getByTestId("image-front").setInputFiles({
    name: "protegido.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await locked.save()),
  });
  await expect(page.locator("#image-front-error")).toContainText("contraseña");
  const invalid = await PDFDocument.create();
  invalid.addPage([200, 200]).node.set(PDFName.of("Rotate"), PDFNumber.of(45));
  await page
    .getByTestId("image-front")
    .setInputFiles({
      name: "geometria.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(await invalid.save()),
    });
  await expect(page.locator("#image-front-error")).toContainText(
    "geometría inválida",
  );
  const blank = await PDFDocument.create();
  blank.addPage([400, 200]);
  await upload(page, await blank.save(), "vacio.pdf");
  await page.getByLabel("Hasta (incluido)", { exact: true }).fill("1");
  expect((await PDFDocument.load(await download(page))).getPageCount()).toBe(1);
  expect(transfers).toEqual([]);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(async () => ({
      local: localStorage.length,
      session: sessionStorage.length,
      databases: await indexedDB.databases(),
      caches: await caches.keys(),
    })),
  ).toEqual({ local: 0, session: 0, databases: [], caches: [] });
});

for (const rotation of [0, 90, 180, 270]) {
  test(`PDF nativo: recorte, UserUnit y giro ${rotation} conservados`, async ({
    page,
  }) => {
    await page.goto("/");
    await upload(page, await template(rotation, 2));
    const before = await artworkSamples(page);
    await page.getByLabel("Hasta (incluido)", { exact: true }).fill("1");
    await page.getByLabel("Filas", { exact: true }).fill("1");
    await page.getByLabel("Columnas", { exact: true }).fill("1");
    await page.getByLabel("Margen mínimo (mm)", { exact: true }).fill("0");
    await choose(page, "Tamaño de papel", "Personalizado");
    await page.getByLabel("Lado 1 (mm)", { exact: true }).fill("100");
    await page.getByLabel("Lado 2 (mm)", { exact: true }).fill("200");
    await page
      .getByRole("radio", {
        name: rotation === 90 || rotation === 270 ? "Vertical" : "Horizontal",
        exact: true,
      })
      .click();
    const output = await download(page);
    await upload(page, output, "exportado.pdf");
    const after = await artworkSamples(page);
    expect(after.ratio).toBeCloseTo(before.ratio, 2);
    expect(after.colors).toEqual(before.colors);
    expect(after.colors.every((c) => c[1] === 0)).toBe(true); // No green outside CropBox.
  });
}

test("coberturas editables, giros, capas y bloqueo por borde", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /prueba con un ejemplo/i }).click();
  await page.getByLabel("Hasta (incluido)", { exact: true }).fill("1");
  await choose(page, "Giro del elemento", "270° · vertical hacia arriba");
  await expect(
    page.getByTestId("ticket-canvas").locator('g[transform^="rotate(270"]'),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Cobertura", exact: true }).click();
  await page.getByLabel("Ancho de cobertura (%)", { exact: true }).fill("20");
  await page.getByLabel("Alto de cobertura (%)", { exact: true }).fill("15");
  const cover = page.getByTestId("ticket-canvas").getByRole("button", {
    name: "Cobertura, seleccionar y mover",
    exact: true,
  });
  await cover.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByLabel("Posición X (%)", { exact: true })).toHaveValue(
    "49.5",
  );
  await page.getByRole("button", { name: "Duplicar", exact: true }).click();
  await expect(
    page.getByTestId("ticket-canvas").locator("[data-cover]"),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(
    page.getByTestId("ticket-canvas").locator("[data-cover]"),
  ).toHaveCount(1);
  await choose(page, "Elemento seleccionado", "Cobertura 1");
  await page.getByLabel("Posición X (%)", { exact: true }).fill("0");
  await expect(
    page.getByRole("button", { name: "Generar PDF", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Posición X (%)", { exact: true }).fill("50");
  await expect(
    page.getByRole("button", { name: "Generar PDF", exact: true }),
  ).toBeEnabled();
  const svg = page.getByTestId("ticket-canvas");
  expect(
    await svg.evaluate(
      (el) =>
        !!(
          el
            .querySelector("[data-cover]")!
            .compareDocumentPosition(el.querySelector("text")!) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
    ),
  ).toBe(true);
  await page.getByRole("radio", { name: "Ambos", exact: true }).click();
  expect(Object.keys(unzipSync(await download(page))).sort()).toEqual([
    "boletos-1-1.pdf",
    "hojas/0001-frente.png",
  ]);
});

test("formato anual real: importación, talón vertical y coberturas en PDF y PNG", async ({
  page,
}) => {
  test.skip(
    !process.env.LOTTERY_REFERENCE_PDF,
    "Usa LOTTERY_REFERENCE_PDF para una prueba privada con el archivo anual.",
  );
  await page.goto("/");
  await page
    .getByTestId("image-front")
    .setInputFiles(process.env.LOTTERY_REFERENCE_PDF!);
  await expect(page.getByTestId("ticket-canvas")).toBeVisible();
  await page.getByLabel("Hasta (incluido)", { exact: true }).fill("46");
  await page.getByLabel("Desde", { exact: true }).fill("42");
  await choose(page, "Boletos por hoja", "4 · 2 filas × 2 columnas");
  await page.getByRole("radio", { name: "Horizontal", exact: true }).click();
  async function position(x: string, y: string) {
    await page.getByLabel("Posición X (%)", { exact: true }).fill(x);
    await page.getByLabel("Posición Y (%)", { exact: true }).fill(y);
  }
  await position("9.31", "57.79");
  await page.getByLabel("Tamaño (pt)", { exact: true }).fill("6");
  await choose(page, "Tipografía", "Noto Sans");
  await page.getByLabel("Color", { exact: true }).fill("#ee0000");
  await page.getByRole("button", { name: "Duplicar", exact: true }).click();
  await position("8.65", "37.06");
  await choose(page, "Giro del elemento", "270° · vertical hacia arriba");
  await page.getByRole("button", { name: "Cobertura", exact: true }).click();
  await position("9.31", "57.79");
  await page.getByLabel("Ancho de cobertura (%)", { exact: true }).fill("2.8");
  await page.getByLabel("Alto de cobertura (%)", { exact: true }).fill("2.3");
  await page.getByRole("button", { name: "Cobertura", exact: true }).click();
  await position("8.65", "37.06");
  await page.getByLabel("Ancho de cobertura (%)", { exact: true }).fill("1.8");
  await page.getByLabel("Alto de cobertura (%)", { exact: true }).fill("3.5");
  await expect(page.getByTestId("ticket-canvas").locator("text")).toHaveText([
    "042",
    "042",
  ]);
  await page.getByRole("tab", { name: "Hoja", exact: true }).click();
  await expect(page.getByTestId("sheet-canvas").locator("image")).toHaveCount(
    4,
  );
  await page.getByRole("radio", { name: "Ambos", exact: true }).click();
  const files = unzipSync(await download(page));
  const pdf = await PDFDocument.load(files["boletos-42-46.pdf"]);
  expect(pdf.getPageCount()).toBe(2);
  expect(pdf.getPage(0).getSize()).toMatchObject({ width: 792 });
  await mkdir(".verification", { recursive: true });
  await writeFile(
    ".verification/rifa-2026-ready.pdf",
    files["boletos-42-46.pdf"],
  );
  await writeFile(
    ".verification/rifa-2026-ready.png",
    files["hojas/0001-frente.png"],
  );
  await page
    .getByRole("button", { name: "Página siguiente", exact: true })
    .click();
  await expect(page.getByTestId("sheet-canvas").locator("text")).toHaveText([
    "046",
    "046",
  ]);
  await page.screenshot({
    path: ".verification/rifa-2026-ready-editor.png",
    fullPage: true,
  });
  await page
    .getByRole("combobox", { name: "Tamaño de papel", exact: true })
    .click();
  await page.getByRole("option", { name: /^A4 / }).click();
  await page.getByRole("radio", { name: "Vertical", exact: true }).click();
  await page.getByRole("radio", { name: "PDF", exact: true }).click();
  const a4 = await PDFDocument.load(await download(page));
  expect(a4.getPageCount()).toBe(2);
  expect(a4.getPage(0).getWidth()).toBeCloseTo((210 * 72) / 25.4);
  expect(a4.getPage(0).getHeight()).toBeCloseTo((297 * 72) / 25.4);
});
