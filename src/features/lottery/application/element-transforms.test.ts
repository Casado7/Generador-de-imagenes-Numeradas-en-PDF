import { describe, it, expect, vi } from "vitest";
import { DEFAULT_PROJECT, type TextElement } from "../domain/model";
import { formatNumber } from "../domain/composition";
import {
  textEnvelope,
  constrainTransform,
  resizeFromVector,
  snappedRotation,
  selectionFrame,
  inside,
  elementExtent,
} from "./element-transforms";
const element: TextElement = {
  id: "n",
  kind: "sequence",
  text: "",
  x: 0.5,
  y: 0.5,
  size: 12,
  font: "sans",
  color: "#000000",
};
describe("transformación directa", () => {
  it("mide todo el rango una sola vez y escala su envolvente", () => {
    const measure = vi.fn((value: string, _font: string, size: number) => ({
      width: [...value].reduce((n, c) => n + (c === "8" ? 0.8 : 0.5), 0) * size,
      ascent: size * 0.7,
      descent: size * 0.2,
    }));
    const metrics = { measure },
      sequence = {
        ...DEFAULT_PROJECT.sequence,
        start: 1,
        end: 5000,
        prefix: "B-",
        suffix: "-X",
      };
    const envelope = textEnvelope(element, sequence, metrics);
    expect(measure).toHaveBeenCalledTimes(5000);
    for (const size of [6, 18, 72]) {
      const e = { ...element, size };
      expect(textEnvelope(e, sequence, metrics)).toBe(envelope);
      let width = 0,
        height = 0;
      for (let n = 1; n <= 5000; n++) {
        const m = measure(formatNumber(n, sequence), "sans", size);
        width = Math.max(width, m.width);
        height = Math.max(height, m.ascent + m.descent);
      }
      expect(elementExtent(e, 100, 60, envelope).width).toBeCloseTo(width);
      expect(elementExtent(e, 100, 60, envelope).height).toBeCloseTo(height);
    }
    const calls = measure.mock.calls.length;
    textEnvelope({ ...element, x: 0.1, rotation: 270 }, sequence, metrics);
    expect(measure).toHaveBeenCalledTimes(calls);
  });
  it.each([0, 90, 180, 270] as const)(
    "limita tamaño, movimiento y giro a %i",
    (rotation) => {
      const e = { ...element, rotation };
      const envelope = { width: 1, height: 0.4 };
      const result = constrainTransform(e, { size: 120 }, 100, 50, envelope);
      expect(result.element.x).toBe(0.5);
      expect(result.element.y).toBe(0.5);
      const extent = elementExtent(result.element, 100, 50, envelope);
      expect(inside(50, 25, extent.width, extent.height, 100, 50)).toBe(true);
      expect((result.element as TextElement).size).toBeLessThanOrEqual(72);
      expect(
        (
          constrainTransform(e, { size: 1 }, 100, 50, envelope)
            .element as TextElement
        ).size,
      ).toBe(6);
      const moved = constrainTransform(
        e,
        { x: 0, y: 1 },
        100,
        50,
        envelope,
      ).element;
      const dims = elementExtent(moved, 100, 50, envelope);
      expect(
        inside(moved.x * 100, moved.y * 50, dims.width, dims.height, 100, 50),
      ).toBe(true);
    },
  );
  it("rechaza un giro sin cabida y valores no finitos", () => {
    const e = { ...element, y: 0.05, size: 6 };
    expect(
      constrainTransform(e, { rotation: 90 }, 100, 50, {
        width: 2,
        height: 0.4,
      }).element,
    ).toBe(e);
    expect(
      constrainTransform(e, { size: NaN }, 100, 50, { width: 2, height: 0.4 })
        .element,
    ).toBe(e);
  });
  it("redimensiona desde el marco ampliado, sin salto ni inversión", () => {
    for (const [x, y] of [
      [36, 36],
      [-36, 36],
      [36, -36],
      [-36, -36],
    ]) {
      expect(resizeFromVector(12, { x, y }, { x, y })).toBe(12);
      expect(resizeFromVector(12, { x, y }, { x: x * 2, y: y * 2 })).toBe(24);
      expect(resizeFromVector(12, { x, y }, { x: -x, y: -y })).toBe(6);
    }
  });
  it("ajusta cuartos, conserva umbrales y cruza cero en ambos sentidos", () => {
    expect(snappedRotation(0, 54, 0, 0)).toBe(0);
    expect(snappedRotation(0, 56, 0, 0)).toBe(90);
    expect(snappedRotation(0, 40, 0, 90)).toBe(90);
    expect(snappedRotation(0, 34, 0, 90)).toBe(0);
    expect(snappedRotation(170, -130, 270, 270)).toBe(0);
    expect(snappedRotation(-170, 130, 0, 0)).toBe(270);
  });
  it("mantiene zonas de 44 px separadas con cualquier zoom", () => {
    for (const unit of [0.1, 0.3, 1]) {
      const f = selectionFrame(1, 2, 270, unit);
      expect(f.hit / unit).toBe(44);
      expect(2 * f.halfWidth).toBeGreaterThan(f.hit);
      expect(2 * f.halfHeight).toBeGreaterThan(f.hit);
      expect(f.turnGap).toBeGreaterThan(f.hit);
    }
  });
});
