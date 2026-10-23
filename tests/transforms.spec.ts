import { test, expect, type Page, type Locator } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import {
  PDFDocument,
  PDFName,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";
import { unzipSync } from "fflate";

async function sample(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /prueba con un ejemplo/i }).click();
  await expect(page.getByTestId("transform-frame")).toBeVisible();
  await page.getByLabel("Posición X (%)", { exact: true }).fill("50");
  await page.getByLabel("Posición Y (%)", { exact: true }).fill("50");
}
async function center(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  expect(b).toBeTruthy();
  return { x: b!.x + b!.width / 2, y: b!.y + b!.height / 2 };
}
const size = (page: Page) => page.getByLabel("Tamaño (pt)", { exact: true });
async function resize(page: Page, factor = 1.5, release = true) {
  const c = await center(
    page.getByTestId("transform-frame").locator(":scope > rect").first(),
  );
  const p = await center(page.getByTestId("resize-handle-3"));
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(
    c.x + (p.x - c.x) * factor,
    c.y + (p.y - c.y) * factor,
    { steps: 8 },
  );
  if (release) await page.mouse.up();
}
test("tamaño y giro sobre el lienzo, barra, independencia y límites", async ({
  page,
}) => {
  await sample(page);
  for (const zoom of [50, 100, 150]) {
    await page.getByLabel("Zoom", { exact: true }).fill(String(zoom));
    const h = page.getByTestId("resize-handle-3");
    const b = await h.boundingBox();
    expect(b!.width).toBeCloseTo(44, 0);
    expect(b!.height).toBeCloseTo(44, 0);
  }
  await page.getByLabel("Zoom", { exact: true }).fill("100");
  await resize(page);
  await expect(size(page)).toHaveValue("18");
  await expect(page.getByLabel("Posición X (%)", { exact: true })).toHaveValue(
    "50",
  );
  await expect(page.getByLabel("Posición Y (%)", { exact: true })).toHaveValue(
    "50",
  );
  const c = await center(
    page.getByTestId("transform-frame").locator(":scope > rect").first(),
  );
  const h = await center(page.getByTestId("rotation-handle"));
  const radius = c.y - h.y;
  await page.mouse.move(h.x, h.y);
  await page.mouse.down();
  await page.mouse.move(c.x + radius, c.y, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByTestId("transform-toolbar")).toContainText("90°");
  await page
    .getByRole("button", { name: "Aumentar tamaño", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(size(page)).toHaveValue("19");
  await page
    .getByRole("button", { name: "Girar a la izquierda", exact: true })
    .click();
  await expect(page.getByTestId("transform-toolbar")).toContainText("0°");
  const other = page
    .getByTestId("ticket-canvas")
    .locator('[data-element-id="sample-talon"]');
  await expect(other.locator("text")).toHaveAttribute("font-size", /4\.233/);
  await page
    .getByRole("button", { name: "Duplicar selección", exact: true })
    .click();
  await expect(page.getByTestId("ticket-canvas").locator("text")).toHaveCount(
    3,
  );
  await page
    .getByRole("button", { name: "Duplicar selección", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Duplicar selección", exact: true }),
  ).toBeDisabled();
  for (let i = 0; i < 3; i++) {
    const el = page
      .getByTestId("ticket-canvas")
      .locator("[data-element-id]")
      .last();
    await el.focus();
    await page.keyboard.press("Enter");
    await page
      .getByRole("button", { name: "Eliminar selección", exact: true })
      .click();
  }
  const last = page
    .getByTestId("ticket-canvas")
    .locator("[data-element-id]")
    .first();
  await last.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Eliminar selección", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Posición X (%)", { exact: true }).fill("10");
  await resize(page, 8);
  expect(Number(await size(page).inputValue())).toBeLessThan(72);
  await expect(
    page.getByRole("button", { name: "Generar PDF", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: ".verification/transforms-desktop.png",
    fullPage: true,
  });
});

test("Escape, cancelación de puntero y cambio de vista restauran el gesto", async ({
  page,
}) => {
  await sample(page);
  await resize(page, 1.3, false);
  await expect(size(page)).not.toHaveValue("12");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(size(page)).toHaveValue("12");
  await resize(page, 1.4, false);
  await expect(size(page)).not.toHaveValue("12");
  await page
    .getByTestId("ticket-canvas")
    .dispatchEvent("pointercancel", { pointerId: 1 });
  await page.mouse.up();
  await expect(size(page)).toHaveValue("12");
  await resize(page, 1.3, false);
  await expect(size(page)).not.toHaveValue("12");
  await page.getByRole("tab", { name: "Hoja", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.mouse.up();
  await expect(page.getByTestId("sheet-canvas")).toBeVisible();
  await expect(page.getByTestId("transform-frame")).toHaveCount(0);
  await page.getByRole("tab", { name: "Boleto", exact: true }).click();
  await expect(size(page)).toHaveValue("12");
});

test.describe("toque", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("tiradores independientes y táctiles en números pequeños", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "La inyección táctil nativa de esta prueba utiliza CDP.",
    );
    await sample(page);
    await size(page).fill("6");
    const boxes = [];
    for (const id of [
      "resize-handle-0",
      "resize-handle-1",
      "resize-handle-2",
      "resize-handle-3",
      "rotation-handle",
    ]) {
      const b = await page.getByTestId(id).boundingBox();
      expect(b).toBeTruthy();
      expect(b!.width).toBeCloseTo(44, 0);
      expect(b!.height).toBeCloseTo(44, 0);
      boxes.push(b!);
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        expect(
          a.x + a.width <= b.x + 0.5 ||
            b.x + b.width <= a.x + 0.5 ||
            a.y + a.height <= b.y + 0.5 ||
            b.y + b.height <= a.y + 0.5,
        ).toBe(true);
      }
    const p = await center(page.getByTestId("resize-handle-3"));
    const session = await context.newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: p.x, y: p.y }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: p.x + 18, y: p.y + 18 }],
    });
    await page.waitForTimeout(50);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(async () => Number(await size(page).inputValue()))
      .toBeGreaterThan(6);
    const c = await center(
      page.getByTestId("transform-frame").locator(":scope > rect").first(),
    );
    const turn = await center(page.getByTestId("rotation-handle"));
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [turn],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: c.x + c.y - turn.y, y: c.y }],
    });
    await page.waitForTimeout(50);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.getByTestId("transform-toolbar")).toContainText("90°");
    await page
      .getByRole("button", { name: "Girar a la derecha", exact: true })
      .tap();
    await expect(page.getByTestId("transform-toolbar")).toContainText("180°");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await page.screenshot({
      path: ".verification/transforms-mobile.png",
      fullPage: true,
    });
  });
});

test("cambiar de cara cancela el gesto y conserva ambas caras", async ({
  page,
}) => {
  await sample(page);
  const bytes = await page.evaluate(async () => {
    const href = document
      .querySelector('[data-testid="ticket-canvas"] image')!
      .getAttribute("href")!;
    return Array.from(new Uint8Array(await (await fetch(href)).arrayBuffer()));
  });
  await page
    .getByRole("radio", { name: "Frente y reverso", exact: true })
    .click();
  await page
    .getByTestId("image-back")
    .setInputFiles({
      name: "back.png",
      mimeType: "image/png",
      buffer: Buffer.from(bytes),
    });
  await page
    .getByRole("combobox", { name: "¿Qué cara lleva número?", exact: true })
    .click();
  await page.getByRole("option", { name: "Ambas caras", exact: true }).click();
  await expect(size(page)).toHaveValue("12");
  await resize(page, 1.3, false);
  await expect(size(page)).not.toHaveValue("12");
  await page.getByRole("radio", { name: "Reverso", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.mouse.up();
  const back = page
    .getByTestId("ticket-canvas")
    .locator('[data-element-id="back-number"]');
  await back.focus();
  await page.keyboard.press("Enter");
  await expect(size(page)).toHaveValue("14");
  await page.getByRole("radio", { name: "Frente", exact: true }).click();
  const front = page
    .getByTestId("ticket-canvas")
    .locator('[data-element-id="front-number"]');
  await front.focus();
  await page.keyboard.press("Enter");
  await expect(size(page)).toHaveValue("12");
});

test("descargas reproducen la selección transformada sin controles de edición", async ({
  page,
}) => {
  await sample(page);
  await page.getByLabel("Hasta (incluido)", { exact: true }).fill("1");
  await resize(page);
  await expect(size(page)).toHaveValue("18");
  await page
    .getByRole("button", { name: "Girar a la derecha", exact: true })
    .click();
  await page.getByRole("button", { name: "Texto", exact: true }).click();
  await page
    .getByLabel("Contenido del texto", { exact: true })
    .fill("Fundación");
  await page.getByRole("tab", { name: "Hoja", exact: true }).click();
  await expect(
    page.getByTestId("sheet-canvas").locator("[data-testid=transform-frame]"),
  ).toHaveCount(0);
  await expect(page.getByTestId("transform-toolbar")).toHaveCount(0);
  await page.getByRole("radio", { name: "Ambos", exact: true }).click();
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Generar archivos/ }).click();
  const download = await promise;
  const files = unzipSync(
    new Uint8Array(await readFile((await download.path())!)),
  );
  const pdf = await PDFDocument.load(files["boletos-1-1.pdf"]);
  expect(pdf.getPageCount()).toBe(1);
  const contents = pdf.getPage(0).node.lookup(PDFName.of("Contents"), PDFArray);
  const stream = contents
    .asArray()
    .map((ref) =>
      (() => {
        const stream = pdf.context.lookup(ref);
        if (!(stream instanceof PDFRawStream))
          throw new Error("Contenido PDF inesperado");
        return new TextDecoder().decode(decodePDFRawStream(stream).decode());
      })(),
    )
    .join("\n");
  expect(stream).toMatch(/18 Tf/);
  expect(stream).not.toMatch(/transform-frame|resize-handle|Girar elemento/);
  await mkdir(".verification", { recursive: true });
  await writeFile(
    ".verification/transforms-export.pdf",
    files["boletos-1-1.pdf"],
  );
  await writeFile(
    ".verification/transforms-export.png",
    files["hojas/0001-frente.png"],
  );
});
