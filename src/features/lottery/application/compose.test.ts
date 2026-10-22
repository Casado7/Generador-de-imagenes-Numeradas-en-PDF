import { describe, expect, it } from "vitest";
import { DEFAULT_PROJECT, type TextElement } from "../domain/model";
import { planPage } from "../domain/composition";
import { prepareProject, renderPage, rotatePoint } from "./compose";
const images = { front: { width: 2, height: 1 } };
const metrics = { measure: () => ({ width: 20, ascent: 3, descent: 1 }) };
function setup() {
  const p = structuredClone(DEFAULT_PROJECT);
  p.sequence.end = 1;
  Object.assign(p.layout, {
    rows: 1,
    columns: 1,
    sizing: "manual",
    cardWidth: 100,
  });
  return p;
}
describe("elementos girados y coberturas", () => {
  it("valida el contorno girado, no el horizontal anterior", () => {
    const p = setup(),
      e = p.elements.front[0] as TextElement;
    e.x = 0.04;
    e.y = 0.5;
    expect(() => prepareProject(p, images, metrics)).toThrow(/sale/);
    e.rotation = 90;
    expect(() => prepareProject(p, images, metrics)).not.toThrow();
    e.y = 0.1;
    expect(() => prepareProject(p, images, metrics)).toThrow(/sale/);
  });
  it.each([0, 90, 180, 270] as const)(
    "mantiene centro y origen para giro %i",
    (rotation) => {
      const p = setup(),
        e = p.elements.front[0] as TextElement;
      e.x = e.y = 0.5;
      e.rotation = rotation;
      const l = prepareProject(p, images, metrics);
      const run = renderPage(planPage(p, images, l, 0), metrics).cards[0]
        .runs[0];
      const expected =
        rotation === 0
          ? [-10, 1]
          : rotation === 90
            ? [-1, -10]
            : rotation === 180
              ? [10, -1]
              : [1, 10];
      expect(run.originX - run.cx).toBeCloseTo(expected[0]);
      expect(run.originY - run.cy).toBeCloseTo(expected[1]);
      expect(rotatePoint(2, 3, 90)).toEqual({ x: -3, y: 2 });
    },
  );
  it("separa coberturas de números aunque se creen después", () => {
    const p = setup();
    p.elements.front.push({
      kind: "cover",
      id: "cover",
      x: 0.5,
      y: 0.5,
      width: 0.2,
      height: 0.1,
      color: "#ffffff",
    });
    const l = prepareProject(p, images, metrics);
    const c = renderPage(planPage(p, images, l, 0), metrics).cards[0];
    expect(c.runs).toHaveLength(1);
    expect(c.covers[0]).toMatchObject({
      width: 20,
      height: 5,
      color: "#ffffff",
    });
    p.elements.front[1].x = 0;
    expect(() => prepareProject(p, images, metrics)).toThrow(/cobertura/);
  });
});
