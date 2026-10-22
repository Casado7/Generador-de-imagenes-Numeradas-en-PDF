import { describe, expect, it } from "vitest";
import { DEFAULT_PROJECT, mmToPx, type Project } from "./model";
import {
  calculateLayout,
  fitImage,
  formatNumber,
  planPage,
} from "./composition";
import { prepareProject } from "../application/compose";
const images = {
  front: { width: 1000, height: 500 },
  back: { width: 500, height: 1000 },
};
const project = (): Project => structuredClone(DEFAULT_PROJECT);

describe("numeración y composición", () => {
  it("incluye cero y el fin, sin truncar relleno", () => {
    const p = project();
    p.sequence = { start: 0, end: 10, pad: 3, prefix: "B-", suffix: "" };
    const l = calculateLayout(p, images);
    expect(l.count).toBe(11);
    expect(planPage(p, images, l, 0).cards[0].label).toBe("B-000");
    expect(planPage(p, images, l, 1).cards.map((c) => c.label)).toEqual([
      "B-009",
      "B-010",
    ]);
    expect(formatNumber(1000, p.sequence)).toBe("B-1000");
  });
  it("rechaza entradas y cuadrículas imposibles", () => {
    for (const [start, end] of [
      [1, 0],
      [1.2, 4],
      [-1, 2],
      [0, 5000],
    ]) {
      const p = project();
      Object.assign(p.sequence, { start, end });
      expect(() => calculateLayout(p, images)).toThrow();
    }
    const p = project();
    p.layout.sizing = "manual";
    p.layout.cardWidth = 300;
    expect(() => calculateLayout(p, images)).toThrow(/no caben/);
  });
  it("pagina 201 tarjetas 4x2 y deja huecos", () => {
    const p = project();
    Object.assign(p.sequence, { start: 0, end: 200 });
    Object.assign(p.layout, { rows: 4, columns: 2 });
    const l = calculateLayout(p, images);
    expect(l.pages).toBe(26);
    expect(planPage(p, images, l, 25).cards.map((c) => c.number)).toEqual([
      200,
    ]);
  });
  it.each(["portrait", "landscape"] as const)(
    "impone reversos de ambos bordes en %s",
    (orientation) => {
      for (const flip of ["long", "short"] as const) {
        const p = project();
        p.mode = "duplex";
        p.numbered = "both";
        p.sequence.end = 10;
        Object.assign(p.layout, { rows: 3, columns: 3, orientation, flip });
        const l = calculateLayout(p, images),
          back = planPage(p, images, l, 3);
        expect(l.pages).toBe(4);
        expect(back.cards).toHaveLength(1);
        expect(back.cards[0].label).toBe("010");
        const columns = (orientation === "portrait") === (flip === "long");
        expect(back.cards[0].x).toBeCloseTo(
          columns ? l.left + 2 * (l.cardWidth + p.layout.gapX) : l.left,
        );
        expect(back.cards[0].y).toBeCloseTo(
          columns ? l.top : l.top + 2 * (l.cardHeight + p.layout.gapY),
        );
      }
    },
  );
  it("mantiene medidas y proporciones de las imágenes", () => {
    const p = project();
    p.layout.sizing = "manual";
    p.layout.cardWidth = 60;
    const l = calculateLayout(p, images);
    expect(l.cardHeight).toBe(30);
    expect(
      fitImage(images.back, { x: 0, y: 0, width: 60, height: 30 }),
    ).toEqual({ x: 22.5, y: 0, width: 15, height: 30 });
    expect(mmToPx(215.9, 300)).toBe(2550);
    expect(mmToPx(279.4, 300)).toBe(3300);
  });
  it("comparte identificador en ambas caras y repite textos", () => {
    const p = project();
    p.mode = "duplex";
    p.numbered = "both";
    p.elements.front.push({ ...p.elements.front[0], id: "talon", x: 0.2 });
    const l = calculateLayout(p, images);
    expect(
      planPage(p, images, l, 0).cards[0].elements.map((e) => e.value),
    ).toEqual(["001", "001"]);
    expect(planPage(p, images, l, 1).cards[0].elements[0].value).toBe("001");
    p.numbered = "back";
    expect(planPage(p, images, l, 0).cards[0].elements).toHaveLength(0);
  });
  it("comprueba todos los números para detectar desbordes", () => {
    const p = project();
    p.sequence.end = 9;
    const measure = (value: string) => ({
      width: value === "008" ? 1000 : 1,
      ascent: 1,
      descent: 0,
    });
    expect(() => prepareProject(p, images, { measure })).toThrow(
      /sale de la tarjeta/,
    );
  });
});
