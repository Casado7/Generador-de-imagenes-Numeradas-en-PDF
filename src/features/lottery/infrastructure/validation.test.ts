import { describe, expect, it } from "vitest";
import { DEFAULT_PROJECT, LIMITS } from "../domain/model";
import { checkDimensions, inspectImage } from "./images";
import {
  elementSchema,
  projectSchema,
  uploadSchema,
  workerMessageSchema,
} from "./validation";
describe("entradas", () => {
  it("acepta PDF, giros cardinales y límites de cobertura", () => {
    expect(
      uploadSchema.safeParse({ size: 100, type: "application/pdf" }).success,
    ).toBe(true);
    expect(
      elementSchema.safeParse({
        ...DEFAULT_PROJECT.elements.front[0],
        rotation: 45,
      }).success,
    ).toBe(false);
    expect(
      elementSchema.safeParse({
        kind: "cover",
        id: "cover",
        x: 0.5,
        y: 0.5,
        color: "#ffffff",
        width: 0,
        height: 0.1,
      }).success,
    ).toBe(false);
    const p = structuredClone(DEFAULT_PROJECT);
    for (let i = 0; i < 9; i++)
      p.elements.front.push({
        kind: "cover",
        id: `cover-${i}`,
        x: 0.5,
        y: 0.5,
        color: "#ffffff",
        width: 0.1,
        height: 0.1,
      });
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
  it("valida configuración y relaciones entre campos", () => {
    expect(projectSchema.safeParse(DEFAULT_PROJECT).success).toBe(true);
    for (const value of [NaN, "", 1.5, -1, 1000000000])
      expect(
        projectSchema.safeParse({
          ...DEFAULT_PROJECT,
          sequence: { ...DEFAULT_PROJECT.sequence, start: value },
        }).success,
      ).toBe(false);
    expect(
      projectSchema.safeParse({
        ...DEFAULT_PROJECT,
        sequence: { ...DEFAULT_PROJECT.sequence, start: 5, end: 4 },
      }).success,
    ).toBe(false);
  });
  it("rechaza archivos y mensajes fuera del contrato", () => {
    expect(
      uploadSchema.safeParse({ size: LIMITS.imageBytes + 1, type: "image/png" })
        .success,
    ).toBe(false);
    expect(
      uploadSchema.safeParse({ size: 100, type: "image/svg+xml" }).success,
    ).toBe(false);
    expect(
      workerMessageSchema.safeParse({ type: "result", job: "a" }).success,
    ).toBe(false);
  });
  it("inspecciona firma y dimensiones antes de decodificar", () => {
    const png = new Uint8Array(24);
    png.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
    png.set([73, 72, 68, 82], 12);
    const view = new DataView(png.buffer);
    view.setUint32(16, 1200);
    view.setUint32(20, 600);
    expect(inspectImage(png)).toEqual({
      width: 1200,
      height: 600,
      mime: "image/png",
    });
    expect(() => inspectImage(new Uint8Array([0, 1, 2]))).toThrow();
    expect(() => checkDimensions({ width: 10000, height: 10000 })).toThrow();
    expect(() => checkDimensions({ width: 0, height: 100 })).toThrow();
  });
});
