import { z } from "zod";
import { LIMITS } from "../domain/model";

const number = (min: number, max: number) =>
  z
    .number({ error: "Introduce un número válido." })
    .min(min, `Mínimo ${min}.`)
    .max(max, `Máximo ${max}.`);
const integer = (min: number, max: number) =>
  number(min, max).int("Usa un número entero.");
const position = {
  id: z.string().min(1),
  x: number(0, 1),
  y: number(0, 1),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Elige un color válido."),
};
export const elementSchema = z.discriminatedUnion("kind", [
  z.object({
    ...position,
    kind: z.enum(["sequence", "text"]),
    text: z
      .string()
      .max(80, "Máximo 80 caracteres.")
      .refine((s) => !/[\r\n]/.test(s), "Usa una sola línea."),
    size: number(6, 72),
    font: z.enum(["sans", "mono"]),
    rotation: z
      .union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])
      .optional(),
  }),
  z.object({
    ...position,
    kind: z.literal("cover"),
    width: number(0.001, 1),
    height: number(0.001, 1),
  }),
]);
const elementsSchema = z
  .array(elementSchema)
  .max(16)
  .superRefine((elements, ctx) => {
    for (const kind of ["text", "sequence"])
      if (elements.filter((e) => e.kind === kind).length > 4)
        ctx.addIssue({
          code: "custom",
          message: "Máximo cuatro números y cuatro textos por cara.",
        });
    if (elements.filter((e) => e.kind === "cover").length > 8)
      ctx.addIssue({
        code: "custom",
        message: "Máximo ocho coberturas por cara.",
      });
    if (new Set(elements.map((e) => e.id)).size !== elements.length)
      ctx.addIssue({
        code: "custom",
        message: "Los elementos deben tener identificadores únicos.",
      });
  });
export const projectSchema = z.object({
  mode: z.enum(["single", "duplex"]),
  numbered: z.enum(["front", "back", "both"]),
  sequence: z
    .object({
      start: integer(0, 999999999),
      end: integer(0, 999999999),
      pad: integer(1, 9),
      prefix: z
        .string()
        .max(20)
        .refine((s) => !/[\r\n]/.test(s), "Usa una sola línea."),
      suffix: z
        .string()
        .max(20)
        .refine((s) => !/[\r\n]/.test(s), "Usa una sola línea."),
    })
    .superRefine((s, ctx) => {
      if (s.end < s.start)
        ctx.addIssue({
          code: "custom",
          path: ["end"],
          message: "El final debe ser mayor o igual al inicio.",
        });
      if (s.end - s.start + 1 > LIMITS.tickets)
        ctx.addIssue({
          code: "custom",
          path: ["end"],
          message: `Máximo ${LIMITS.tickets} tarjetas. Reduce el rango.`,
        });
    }),
  layout: z.object({
    paper: z.enum(["letter", "a4", "oficio", "legal", "custom"]),
    width: number(50, 600),
    height: number(50, 600),
    orientation: z.enum(["portrait", "landscape"]),
    rows: integer(1, 10),
    columns: integer(1, 10),
    margin: number(0, 300),
    gapX: number(0, 300),
    gapY: number(0, 300),
    sizing: z.enum(["auto", "manual"]),
    cardWidth: number(5, 600),
    flip: z.enum(["long", "short"]),
  }),
  elements: z.object({ front: elementsSchema, back: elementsSchema }),
});
export const uploadSchema = z.object({
  size: number(1, LIMITS.imageBytes),
  type: z.enum(["image/png", "image/jpeg", "application/pdf"]),
});
export const progressSchema = z.object({
  type: z.literal("progress"),
  job: z.string(),
  stage: z.enum(["preparing", "pages", "packing"]),
  done: integer(0, LIMITS.pages),
  total: integer(1, LIMITS.pages),
});
export const workerMessageSchema = z.discriminatedUnion("type", [
  progressSchema,
  z.object({
    type: z.literal("result"),
    job: z.string(),
    bytes: z.instanceof(Uint8Array),
    name: z.string(),
    mime: z.string(),
  }),
  z.object({ type: z.literal("error"), job: z.string(), message: z.string() }),
  z.object({
    type: z.literal("raster"),
    job: z.string(),
    page: integer(0, LIMITS.pages),
  }),
]);
export const imageInfosSchema = z.object({
  front: z
    .object({
      width: integer(1, LIMITS.imageSide),
      height: integer(1, LIMITS.imageSide),
    })
    .optional(),
  back: z
    .object({
      width: integer(1, LIMITS.imageSide),
      height: integer(1, LIMITS.imageSide),
    })
    .optional(),
});
export const exportRequestSchema = z.object({
  project: projectSchema,
  images: imageInfosSchema,
  format: z.enum(["pdf", "images", "both"]),
  dpi: z.union([z.literal(150), z.literal(300)]),
});
