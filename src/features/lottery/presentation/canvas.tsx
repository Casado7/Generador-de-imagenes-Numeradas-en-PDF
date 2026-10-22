"use client";
import { useRef } from "react";
import type { RenderPage } from "../application/ports";
import { fontSizeMm } from "../application/compose";
import { FONT_FAMILIES } from "../infrastructure/fonts";
import type { Face } from "../domain/model";

export function PreviewCanvas({
  page,
  urls,
  editable = false,
  selected,
  onSelect,
  onMove,
}: {
  page: RenderPage;
  urls: Partial<Record<Face, string>>;
  editable?: boolean;
  selected?: string | null;
  onSelect?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; deltaX: number; deltaY: number } | null>(
    null,
  );
  const card = page.cards[0];
  function point(event: React.PointerEvent<SVGGElement | SVGSVGElement>) {
    const matrix = svg.current?.getScreenCTM();
    return matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(
          matrix.inverse(),
        )
      : null;
  }
  function handles(id: string, label: string) {
    if (!editable) return {};
    const element = card?.elements.find((e) => e.id === id);
    return {
      role: "button",
      tabIndex: 0,
      "aria-label": `${label}, seleccionar y mover`,
      style: { cursor: "move" },
      onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => {
        if (!element) return;
        if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          onSelect?.(id);
        }
        const step = event.shiftKey ? 0.05 : 0.005;
        if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
            event.key,
          )
        ) {
          event.preventDefault();
          onSelect?.(id);
          onMove?.(
            id,
            Math.max(
              0,
              Math.min(
                1,
                element.x +
                  (event.key === "ArrowRight"
                    ? step
                    : event.key === "ArrowLeft"
                      ? -step
                      : 0),
              ),
            ),
            Math.max(
              0,
              Math.min(
                1,
                element.y +
                  (event.key === "ArrowDown"
                    ? step
                    : event.key === "ArrowUp"
                      ? -step
                      : 0),
              ),
            ),
          );
        }
      },
      onPointerDown: (event: React.PointerEvent<SVGGElement>) => {
        const p = point(event);
        if (!p || !element) return;
        event.preventDefault();
        onSelect?.(id);
        svg.current?.setPointerCapture(event.pointerId);
        drag.current = {
          id,
          deltaX: p.x - card.x - card.width * element.x,
          deltaY: p.y - card.y - card.height * element.y,
        };
      },
    };
  }
  return (
    <svg
      ref={svg}
      data-testid={editable ? "ticket-canvas" : "sheet-canvas"}
      role="img"
      aria-label={
        editable
          ? "Editor visual del boleto"
          : `Vista previa de página ${page.index + 1}`
      }
      viewBox={`0 0 ${page.width} ${page.height}`}
      className="ticket-paper block h-auto w-full"
      style={{ touchAction: editable ? "none" : "auto" }}
      onPointerMove={(event) => {
        const p = point(event),
          active = drag.current;
        if (!active || !p || !card) return;
        onMove?.(
          active.id,
          Math.max(0, Math.min(1, (p.x - card.x - active.deltaX) / card.width)),
          Math.max(
            0,
            Math.min(1, (p.y - card.y - active.deltaY) / card.height),
          ),
        );
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <rect width={page.width} height={page.height} fill="#ffffff" />
      {page.cards.map((c) => (
        <g key={c.number}>
          <image
            href={urls[page.face]}
            x={c.image.x}
            y={c.image.y}
            width={c.image.width}
            height={c.image.height}
            preserveAspectRatio="xMidYMid meet"
          />
          {c.covers.map((cover) => (
            <g key={cover.id} {...handles(cover.id, "Cobertura")}>
              <rect
                data-cover="true"
                x={cover.x}
                y={cover.y}
                width={cover.width}
                height={cover.height}
                fill={cover.color}
              />
              {editable && (
                <rect
                  x={cover.x}
                  y={cover.y}
                  width={cover.width}
                  height={cover.height}
                  fill="transparent"
                  stroke={
                    selected === cover.id
                      ? "var(--primary)"
                      : "var(--muted-foreground)"
                  }
                  strokeWidth={0.2}
                  strokeDasharray="1 1"
                />
              )}
            </g>
          ))}
          {c.runs.map((run) => (
            <g
              key={run.id}
              {...handles(run.id, run.text || "Texto vacío")}
              transform={`rotate(${run.rotation} ${run.cx} ${run.cy})`}
            >
              {editable && (
                <rect
                  x={run.x - 1}
                  y={run.top - 1}
                  width={Math.max(run.width, 4) + 2}
                  height={run.height + 2}
                  fill="transparent"
                  stroke={
                    selected === run.id ? "var(--primary)" : "transparent"
                  }
                  strokeWidth={0.3}
                  strokeDasharray="1 1"
                />
              )}
              <text
                x={run.x}
                y={run.baseline}
                fontFamily={FONT_FAMILIES[run.font]}
                fontSize={fontSizeMm(run.size)}
                fill={run.color}
                style={{ userSelect: "none" }}
              >
                {run.text}
              </text>
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}
