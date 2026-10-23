import { calculateLayout, faceIsNumbered } from "../domain/composition";
import {
  ptToMm,
  type ImageInfos,
  type Layout,
  type PagePlan,
  type Project,
  type Rotation,
} from "../domain/model";
import type { FontMetrics, RenderPage, TextRun } from "./ports";
import { inside, textEnvelope, elementExtent } from "./element-transforms";

// Clockwise quarter turns in the shared top-left coordinate system.
export function rotatePoint(x: number, y: number, rotation: Rotation) {
  switch (rotation) {
    case 90:
      return { x: -y, y: x };
    case 180:
      return { x: -x, y: -y };
    case 270:
      return { x: y, y: -x };
    default:
      return { x, y };
  }
}

export function prepareProject(
  project: Project,
  images: ImageInfos,
  metrics: FontMetrics,
): Layout {
  const layout = calculateLayout(project, images);
  const faces =
    project.mode === "duplex"
      ? (["front", "back"] as const)
      : (["front"] as const);
  for (const face of faces) {
    const elements = project.elements[face];
    if (elements.filter((e) => e.kind === "cover").length > 8)
      throw new Error("Se admiten hasta ocho coberturas por cara.");
    for (const kind of ["sequence", "text"] as const) {
      const count = elements.filter((e) => e.kind === kind).length;
      if (
        count > 4 ||
        (kind === "sequence" && faceIsNumbered(project, face) && count === 0)
      )
        throw new Error(
          "Cada cara numerada necesita de uno a cuatro números; se admiten hasta cuatro textos fijos.",
        );
    }
    for (const element of elements) {
      if (element.kind === "sequence" && !faceIsNumbered(project, face))
        continue;
      if (
        ![element.x, element.y].every(
          (n) => Number.isFinite(n) && n >= 0 && n <= 1,
        )
      )
        throw new Error("Revisa la posición y el tamaño de los elementos.");
      const x = element.x * layout.cardWidth,
        y = element.y * layout.cardHeight;
      if (element.kind === "cover") {
        if (
          ![element.width, element.height].every(
            (n) => Number.isFinite(n) && n > 0 && n <= 1,
          ) ||
          !inside(
            x,
            y,
            element.width * layout.cardWidth,
            element.height * layout.cardHeight,
            layout.cardWidth,
            layout.cardHeight,
          )
        )
          throw new Error(
            "Una cobertura sale de la tarjeta. Ajusta su posición o tamaño.",
          );
        continue;
      }
      if (
        !Number.isFinite(element.size) ||
        element.size < 6 ||
        element.size > 72 ||
        ![0, 90, 180, 270].includes(element.rotation ?? 0)
      )
        throw new Error("Revisa el tamaño y el giro de los elementos.");
      const extent = elementExtent(
        element,
        layout.cardWidth,
        layout.cardHeight,
        textEnvelope(element, project.sequence, metrics),
      );
      if (
        !inside(
          x,
          y,
          extent.width,
          extent.height,
          layout.cardWidth,
          layout.cardHeight,
        )
      )
        throw new Error(
          `Un ${element.kind === "text" ? "texto" : "número"} del ${face === "front" ? "frente" : "reverso"} sale de la tarjeta. Ajusta su posición o tamaño.`,
        );
    }
  }
  return layout;
}
export function renderPage(plan: PagePlan, metrics: FontMetrics): RenderPage {
  return {
    ...plan,
    cards: plan.cards.map((card) => ({
      ...card,
      covers: card.elements
        .filter((e) => e.kind === "cover")
        .map((e) => ({
          id: e.id,
          color: e.color,
          x: card.x + card.width * (e.x - e.width / 2),
          y: card.y + card.height * (e.y - e.height / 2),
          width: card.width * e.width,
          height: card.height * e.height,
        })),
      runs: card.elements
        .filter((e) => e.kind !== "cover")
        .map((e): TextRun => {
          const m = metrics.measure(e.value, e.font, e.size);
          const cx = card.x + card.width * e.x,
            cy = card.y + card.height * e.y;
          const rotation = e.rotation ?? 0;
          const origin = rotatePoint(
            -m.width / 2,
            (m.ascent - m.descent) / 2,
            rotation,
          );
          return {
            cx,
            cy,
            rotation,
            originX: cx + origin.x,
            originY: cy + origin.y,
            text: e.value,
            x: cx - m.width / 2,
            baseline: cy + (m.ascent - m.descent) / 2,
            top: cy - (m.ascent + m.descent) / 2,
            width: m.width,
            height: m.ascent + m.descent,
            id: e.id,
            font: e.font,
            size: e.size,
            color: e.color,
          };
        }),
    })),
  };
}
export const fontSizeMm = ptToMm;
