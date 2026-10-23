import type {
  Project,
  Rotation,
  TextElement,
  TicketElement,
} from "../domain/model";
import { formatNumber } from "../domain/composition";
import type { FontMetrics } from "./ports";

export type ElementPatch = Partial<
  Pick<TextElement, "x" | "y" | "size" | "rotation">
>;
export interface Envelope {
  width: number;
  height: number;
}
// Dimensions per point. Font metrics are linear in point size. Keep a bounded
// cache per metric provider so pointer moves never scan the sequence again.
const envelopes = new WeakMap<FontMetrics, Map<string, Envelope>>();
export function textEnvelope(
  element: TextElement,
  sequence: Project["sequence"],
  metrics: FontMetrics,
): Envelope {
  let cache = envelopes.get(metrics);
  if (!cache) {
    cache = new Map();
    envelopes.set(metrics, cache);
  }
  const key = JSON.stringify([
    element.font,
    element.kind === "text" ? element.text : sequence,
  ]);
  const cached = cache.get(key);
  if (cached) return cached;
  const result = { width: 0, height: 0 };
  const count = element.kind === "text" ? 1 : sequence.end - sequence.start + 1;
  for (let i = 0; i < count; i++) {
    const value =
      element.kind === "text"
        ? element.text
        : formatNumber(sequence.start + i, sequence);
    const m = metrics.measure(value, element.font, element.size);
    result.width = Math.max(result.width, m.width / element.size);
    result.height = Math.max(
      result.height,
      (m.ascent + m.descent) / element.size,
    );
  }
  if (cache.size >= 64) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
export function inside(
  cx: number,
  cy: number,
  width: number,
  height: number,
  cardWidth: number,
  cardHeight: number,
) {
  return (
    [cx, cy, width, height, cardWidth, cardHeight].every(Number.isFinite) &&
    cx - width / 2 >= -0.0001 &&
    cx + width / 2 <= cardWidth + 0.0001 &&
    cy - height / 2 >= -0.0001 &&
    cy + height / 2 <= cardHeight + 0.0001
  );
}
export function elementExtent(
  element: TicketElement,
  w: number,
  h: number,
  envelope?: Envelope,
): Envelope {
  if (element.kind === "cover")
    return { width: element.width * w, height: element.height * h };
  const e = envelope ?? { width: 0, height: 0 };
  return element.rotation === 90 || element.rotation === 270
    ? { width: e.height * element.size, height: e.width * element.size }
    : { width: e.width * element.size, height: e.height * element.size };
}
export function constrainTransform(
  element: TicketElement,
  patch: ElementPatch,
  w: number,
  h: number,
  envelope?: Envelope,
) {
  const next = { ...element, ...patch } as TicketElement;
  let reason = "";
  if (!Object.values(patch).every(Number.isFinite))
    return { element, reason: "Revisa el ajuste del elemento." };
  if (next.kind !== "cover" && patch.size !== undefined) {
    const unit = elementExtent({ ...next, size: 1 }, w, h, envelope);
    const max = Math.min(
      72,
      unit.width > 0
        ? (2 * Math.min(next.x * w, (1 - next.x) * w)) / unit.width
        : 72,
      unit.height > 0
        ? (2 * Math.min(next.y * h, (1 - next.y) * h)) / unit.height
        : 72,
    );
    if (max < 6)
      return {
        element,
        reason: "Mueve la marca hacia el interior para ampliar su tamaño.",
      };
    next.size = Math.max(
      6,
      Math.min(Math.floor(max * 10) / 10, Math.round(patch.size * 10) / 10),
    );
    if (Math.abs(next.size - patch.size) > 0.05)
      reason = "Límite de tamaño o del borde del boleto alcanzado.";
  }
  const extent = elementExtent(next, w, h, envelope);
  if (patch.x !== undefined || patch.y !== undefined) {
    if (extent.width > w || extent.height > h)
      return { element, reason: "El elemento no cabe en el boleto." };
    next.x = Math.max(
      extent.width / (2 * w),
      Math.min(1 - extent.width / (2 * w), next.x),
    );
    next.y = Math.max(
      extent.height / (2 * h),
      Math.min(1 - extent.height / (2 * h), next.y),
    );
  }
  if (!inside(next.x * w, next.y * h, extent.width, extent.height, w, h))
    return {
      element,
      reason: "Mueve la marca hacia el interior para aplicar este giro.",
    };
  return { element: next, reason };
}
export function resizeFromVector(
  size: number,
  start: { x: number; y: number },
  current: { x: number; y: number },
) {
  const length = start.x * start.x + start.y * start.y;
  return Math.max(
    6,
    Math.min(
      72,
      length > 0
        ? (size * (start.x * current.x + start.y * current.y)) / length
        : size,
    ),
  );
}
export const normalizeAngle = (angle: number) =>
  ((((angle + 180) % 360) + 360) % 360) - 180;
export function snappedRotation(
  startAngle: number,
  angle: number,
  initial: Rotation,
  last: Rotation,
): Rotation {
  const target = initial + normalizeAngle(angle - startAngle);
  if (Math.abs(normalizeAngle(target - last)) <= 55) return last;
  return ((((Math.round(target / 90) * 90) % 360) + 360) % 360) as Rotation;
}

// Axis-aligned interaction frame around the rotated ink. Screen-size padding
// separates corner hit areas even for the smallest supported type size.
export function selectionFrame(
  width: number,
  height: number,
  rotation: Rotation,
  unit: number,
) {
  const quarter = rotation === 90 || rotation === 270;
  return {
    halfWidth: Math.max((quarter ? height : width) / 2 + 10 * unit, 36 * unit),
    halfHeight: Math.max((quarter ? width : height) / 2 + 10 * unit, 36 * unit),
    hit: 44 * unit,
    turnGap: 52 * unit,
  };
}
