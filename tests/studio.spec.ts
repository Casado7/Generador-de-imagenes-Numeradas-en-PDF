import { test, expect, type Page } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { unzipSync } from "fflate";

async function sample(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /prueba con un ejemplo/i }).click();
  await expect(page.getByTestId("ticket-canvas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generar PDF", exact: true }),
  ).toBeEnabled();
}
async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function download(page: Page) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: /Generar (PDF|archivos)/ }).click();
  const result = await event;
  const path = await result.path();
  expect(path).toBeTruthy();
  return {
    bytes: new Uint8Array(await readFile(path!)),
    name: result.suggestedFilename(),
  };
}

test("editor, fuentes, teclado, zoom y geometría", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await sample(page);
  await page.getByLabel("Hasta (incluido)", { exact: true }).fill("10");
  await page.getByLabel("Posición X (%)", { exact: true }).fill("20");
  await page.getByLabel("Tamaño (pt)", { exact: true }).fill("18");
  await expect(
    page.getByTestId("ticket-canvas").locator("text").first(),
  ).toHaveAttribute("font-size", /6\.35/);
  const number = page.getByTestId("ticket-canvas").getByRole("button").first();
  await number.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Posición X (%)", { exact: true })).toHaveValue(
    "20.5",
  );
  await page.getByLabel("Zoom", { exact: true }).fill("150");
  await expect(page.getByLabel("Posición X (%)", { exact: true })).toHaveValue(
    "20.5",
  );
  const bounds = await number.boundingBox();
  expect(bounds).toBeTruthy();
  await page.mouse.move(
    bounds!.x + bounds!.width / 2,
    bounds!.y + bounds!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds!.x + bounds!.width / 2 + 20,
    bounds!.y + bounds!.height / 2,
    { steps: 5 },
  );
  await page.mouse.up();
  expect(
    Number(
      await page.getByLabel("Posición X (%)", { exact: true }).inputValue(),
    ),
  ).toBeGreaterThan(20.5);
  await choose(page, "Tamaño del boleto", "Elegir ancho en milímetros");
  await page.getByLabel("Ancho del boleto (mm)", { exact: true }).fill("60");
  await page.getByRole("tab", { name: "Hoja", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toBeVisible();
  await expect(page.getByTestId("sheet-canvas").locator("image")).toHaveCount(
    9,
  );
  await page.getByRole("button", { name: "Página siguiente" }).click();
  await expect(page.getByTestId("sheet-canvas").locator("image")).toHaveCount(
    1,
  );
  await page.getByRole("tab", { name: "Boleto", exact: true }).click();
  await page.getByRole("button", { name: "Texto", exact: true }).click();
  await page
    .getByLabel("Contenido del texto", { exact: true })
    .fill("Fundación solidaria");
  await expect(
    page.getByTestId("ticket-canvas").locator("text").last(),
  ).toHaveText("Fundación solidaria");
  await expect(
    page.getByRole("button", { name: "Generar PDF", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: `.verification/editor-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("PDF dúplex, fuentes y última hoja", async ({ page }) => {
  await sample(page);
  await page.getByLabel("Hasta (incluido)", { exact: true }).fill("10");
  await page
    .getByRole("radio", { name: "Frente y reverso", exact: true })
    .click();
  // Use a browser-created synthetic PNG for the second face, with a distinct fill.
  const buffer = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 600;
    const x = c.getContext("2d")!;
    x.fillStyle = "#e7efe6";
    x.fillRect(0, 0, 1200, 600);
    x.fillStyle = "#24664e";
    x.font = "50px sans-serif";
    x.fillText("REVERSO · GRACIAS POR AYUDAR", 100, 200);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page
    .getByTestId("image-back")
    .setInputFiles({
      name: "reverso.png",
      mimeType: "image/png",
      buffer: Buffer.from(buffer, "base64"),
    });
  await choose(page, "¿Qué cara lleva número?", "Ambas caras");
  await page.getByRole("tab", { name: "Hoja", exact: true }).click();
  await page.getByRole("button", { name: "Página siguiente" }).click();
  const first = page.getByTestId("sheet-canvas").locator("image").first();
  expect(Number(await first.getAttribute("x"))).toBeGreaterThan(100);
  const result = await download(page);
  const pdf = await PDFDocument.load(result.bytes);
  expect(pdf.getPageCount()).toBe(4);
  expect(pdf.getPages()[0].getWidth()).toBeCloseTo(612);
  await mkdir(".verification", { recursive: true });
  await writeFile(
    `.verification/browser-duplex-${test.info().project.name}.pdf`,
    result.bytes,
  );
});

test("PDF y PNG a 300 ppp en una única descarga", async ({ page }) => {
  await sample(page);
  await page.getByLabel("Hasta (incluido)", { exact: true }).fill("1");
  await page.getByRole("radio", { name: "Ambos", exact: true }).click();
  await choose(page, "Resolución de imágenes", "300 ppp · mayor resolución");
  const result = await download(page);
  const files = unzipSync(result.bytes);
  expect(Object.keys(files).sort()).toEqual([
    "boletos-1-1.pdf",
    "hojas/0001-frente.png",
  ]);
  const view = new DataView(files["hojas/0001-frente.png"].buffer);
  expect(view.getUint32(16)).toBe(2550);
  expect(view.getUint32(20)).toBe(3300);
  await writeFile(
    `.verification/browser-page-${test.info().project.name}.png`,
    files["hojas/0001-frente.png"],
  );
  await writeFile(
    `.verification/browser-page-${test.info().project.name}.pdf`,
    files["boletos-1-1.pdf"],
  );
});

test("fallback sin OffscreenCanvas", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "OffscreenCanvas", {
      value: undefined,
      configurable: true,
    }),
  );
  await sample(page);
  await page.getByLabel("Hasta (incluido)", { exact: true }).fill("1");
  await page.getByRole("radio", { name: "PNG", exact: true }).click();
  const result = await download(page);
  expect(Object.keys(unzipSync(result.bytes))).toEqual([
    "hojas/0001-frente.png",
  ]);
});

test("validación recuperable y privacidad", async ({ page }) => {
  const sent: string[] = [];
  page.on("request", (r) => {
    // Framework HEAD checks carry no user data; reject bodies and mutating requests.
    if (!["GET", "HEAD"].includes(r.method()) || r.postDataBuffer()?.length)
      sent.push(`${r.method()} ${r.url()}`);
  });
  await sample(page);
  await page
    .getByTestId("image-front")
    .setInputFiles({
      name: "corrupto.png",
      mimeType: "image/png",
      buffer: Buffer.from("no es una imagen"),
    });
  await expect(
    page.getByText("El archivo no contiene una imagen PNG o JPEG válida.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("ticket-canvas")).toBeVisible();
  await page.getByLabel("Hasta (incluido)", { exact: true }).fill("0");
  await expect(
    page.getByRole("button", { name: "Generar PDF", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Hasta (incluido)", { exact: true }).fill("1");
  await page.getByLabel("Prefijo", { exact: true }).fill("🦄");
  await expect(page.getByText(/La fuente no admite el carácter/)).toBeVisible();
  await page.getByLabel("Prefijo", { exact: true }).fill("");
  await download(page);
  expect(
    await page.evaluate(async () => ({
      local: localStorage.length,
      session: sessionStorage.length,
      caches: (await caches.keys()).length,
      databases: (await indexedDB.databases()).length,
    })),
  ).toEqual({ local: 0, session: 0, caches: 0, databases: 0 });
  expect(sent).toEqual([]);
  await page.reload();
  await expect(page.getByTestId("ticket-canvas")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Generar PDF", exact: true }),
  ).toBeDisabled();
});

test("700 boletos, cancelación y exportaciones sucesivas", async ({ page }) => {
  await sample(page);
  await page.getByLabel("Hasta (incluido)", { exact: true }).fill("700");
  await page.getByRole("button", { name: "Generar PDF", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cancelar", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Generar PDF", exact: true }),
  ).toBeEnabled();
  const result = await download(page);
  expect((await PDFDocument.load(result.bytes)).getPageCount()).toBe(78);
  await page.getByLabel("Hasta (incluido)", { exact: true }).fill("1");
  const second = await download(page);
  expect((await PDFDocument.load(second.bytes)).getPageCount()).toBe(1);
});

test("pantalla estrecha y navegación por teclado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Ayuda", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Del diseño a la impresión" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: `.verification/mobile-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("JPEG orientado, tipo engañoso y límite de archivo", async ({ page }) => {
  await page.goto("/");
  const original = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 200;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#24664e";
    ctx.fillRect(0, 0, 400, 200);
    return c.toDataURL("image/jpeg").split(",")[1];
  });
  const jpeg = Buffer.from(original, "base64");
  const exif = Buffer.from([
    0xff, 0xe1, 0, 34, 69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 8, 0, 0, 0, 1, 0,
    18, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0,
  ]);
  await page
    .getByTestId("image-front")
    .setInputFiles({
      name: "orientado.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.concat([jpeg.subarray(0, 2), exif, jpeg.subarray(2)]),
    });
  await expect(page.getByText("200 × 400 px", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generar PDF", exact: true }),
  ).toBeEnabled();
  await page
    .getByTestId("image-front")
    .setInputFiles({ name: "falso.png", mimeType: "image/png", buffer: jpeg });
  await expect(
    page.getByText(
      "El contenido del archivo no coincide con su formato declarado.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByTestId("image-front")
    .setInputFiles({
      name: "grande.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
    });
  await expect(
    page.getByText("Selecciona un PNG, JPEG o PDF de hasta 20 MiB.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("200 × 400 px", { exact: true })).toBeVisible();
});
