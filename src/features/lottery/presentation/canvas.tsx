"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { RenderPage } from "../application/ports";
import { fontSizeMm } from "../application/compose";
import {
  resizeFromVector,
  selectionFrame,
  snappedRotation,
  type ElementPatch,
} from "../application/element-transforms";
import { FONT_FAMILIES } from "../infrastructure/fonts";
import type { Face, Rotation, TicketElement } from "../domain/model";
type Point = { x: number; y: number };
type Gesture = {
  id: string;
  face: Face;
  pointer: number;
  mode: "move" | "size" | "turn";
  initial: TicketElement;
  center: Point;
  start: Point;
  last: Rotation;
};
export function PreviewCanvas({
  page,
  urls,
  editable = false,
  selected,
  onSelect,
  onTransform,
}: {
  page: RenderPage;
  urls: Partial<Record<Face, string>>;
  editable?: boolean;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  onTransform?: (
    face: Face,
    id: string,
    patch: ElementPatch,
    restore?: boolean,
  ) => void;
}) {
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<Gesture | null>(null),
    pending = useRef<Point | null>(null),
    frame = useRef(0);
  const change = useRef(onTransform),
    apply = useRef<(p: Point) => void>(() => {});
  const [unit, setUnit] = useState(0.2);
  const card = page.cards[0];
  const run = editable ? card?.runs.find((r) => r.id === selected) : undefined;
  useLayoutEffect(() => {
    change.current = onTransform;
  });
  const finish = useCallback((restore: boolean) => {
    const active = drag.current;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    pending.current = null;
    drag.current = null;
    if (!active) return;
    if (restore) {
      const e = active.initial;
      change.current?.(
        active.face,
        active.id,
        {
          x: e.x,
          y: e.y,
          ...(e.kind !== "cover"
            ? { size: e.size, rotation: e.rotation ?? 0 }
            : {}),
        },
        true,
      );
    }
    if (svg.current?.hasPointerCapture(active.pointer))
      svg.current.releasePointerCapture(active.pointer);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drag.current) {
        e.preventDefault();
        finish(true);
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      finish(true);
    };
  }, [finish]);
  useEffect(() => {
    if (!editable) finish(false);
  }, [editable, finish]);
  useLayoutEffect(() => {
    const el = svg.current;
    if (!el) return;
    const update = () => {
      const matrix = el.getScreenCTM();
      if (matrix) setUnit(1 / Math.hypot(matrix.a, matrix.b));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [page.width, page.height]);
  function point(event: { clientX: number; clientY: number }): Point | null {
    const matrix = svg.current?.getScreenCTM();
    return matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(
          matrix.inverse(),
        )
      : null;
  }
  useLayoutEffect(() => {
    apply.current = (p: Point) => {
      const active = drag.current;
      if (!active || !card || !editable) return;
      const e = active.initial;
      if (active.mode === "move")
        change.current?.(active.face, e.id, {
          x: e.x + (p.x - active.start.x) / card.width,
          y: e.y + (p.y - active.start.y) / card.height,
        });
      else if (e.kind !== "cover") {
        const vector = { x: p.x - active.center.x, y: p.y - active.center.y },
          start = {
            x: active.start.x - active.center.x,
            y: active.start.y - active.center.y,
          };
        if (active.mode === "size")
          change.current?.(active.face, e.id, {
            size: resizeFromVector(e.size, start, vector),
          });
        else {
          const angle = (v: Point) => (Math.atan2(v.y, v.x) * 180) / Math.PI;
          const rotation = snappedRotation(
            angle(start),
            angle(vector),
            e.rotation ?? 0,
            active.last,
          );
          active.last = rotation;
          change.current?.(active.face, e.id, { rotation });
        }
      }
    };
  });
  function start(
    event: React.PointerEvent<SVGGElement>,
    id: string,
    mode: Gesture["mode"],
  ) {
    if (drag.current || !editable || event.button !== 0) return;
    const p = point(event),
      element = card?.elements.find((e) => e.id === id);
    if (!p || !element) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    onSelect?.(id);
    svg.current?.setPointerCapture(event.pointerId);
    drag.current = {
      id,
      face: page.face,
      pointer: event.pointerId,
      mode,
      initial: { ...element },
      center: {
        x: card.x + card.width * element.x,
        y: card.y + card.height * element.y,
      },
      start: p,
      last: element.kind !== "cover" ? (element.rotation ?? 0) : 0,
    };
  }
  function handles(id: string, label: string) {
    if (!editable) return {};
    return {
      role: "button",
      tabIndex: 0,
      "aria-label": `${label}, seleccionar y mover`,
      style: { cursor: "move", touchAction: "none" },
      onPointerDown: (e: React.PointerEvent<SVGGElement>) =>
        start(e, id, "move"),
      onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => {
        const element = card?.elements.find((e) => e.id === id);
        if (!element) return;
        if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          onSelect?.(id);
        }
        if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
            event.key,
          )
        ) {
          event.preventDefault();
          onSelect?.(id);
          const step = event.shiftKey ? 0.05 : 0.005;
          onTransform?.(page.face, id, {
            x:
              element.x +
              (event.key === "ArrowRight"
                ? step
                : event.key === "ArrowLeft"
                  ? -step
                  : 0),
            y:
              element.y +
              (event.key === "ArrowDown"
                ? step
                : event.key === "ArrowUp"
                  ? -step
                  : 0),
          });
        }
      },
    };
  }
  const selection = run
    ? selectionFrame(run.width, run.height, run.rotation, unit)
    : null;
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
      style={{
        overflow: editable ? "visible" : undefined,
        touchAction: editable ? "none" : "auto",
      }}
      onPointerMove={(event) => {
        if (drag.current?.pointer !== event.pointerId) return;
        pending.current = point(event);
        if (!frame.current)
          frame.current = requestAnimationFrame(() => {
            frame.current = 0;
            if (pending.current) apply.current(pending.current);
            pending.current = null;
          });
      }}
      onPointerUp={(event) => {
        if (drag.current?.pointer !== event.pointerId) return;
        if (pending.current) apply.current(pending.current);
        finish(false);
      }}
      onPointerCancel={(event) => {
        if (drag.current?.pointer === event.pointerId) finish(true);
      }}
      onLostPointerCapture={() => {
        if (drag.current) finish(true);
      }}
    >
      <rect
        width={page.width}
        height={page.height}
        fill="#ffffff"
        onPointerDown={() => onSelect?.(null)}
      />
      {page.cards.map((c) => (
        <g key={c.number}>
          <image
            href={urls[page.face]}
            x={c.image.x}
            y={c.image.y}
            width={c.image.width}
            height={c.image.height}
            preserveAspectRatio="xMidYMid meet"
            onPointerDown={() => onSelect?.(null)}
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
          {c.runs.map((r) => (
            <g
              key={r.id}
              {...handles(r.id, r.text || "Texto vacío")}
              transform={`rotate(${r.rotation} ${r.cx} ${r.cy})`}
              data-element-id={r.id}
            >
              {editable && (
                <rect
                  x={r.x - 1}
                  y={r.top - 1}
                  width={Math.max(r.width, 4) + 2}
                  height={r.height + 2}
                  fill="transparent"
                  stroke={selected === r.id ? "var(--primary)" : "transparent"}
                  strokeWidth={0.3}
                  strokeDasharray="1 1"
                />
              )}
              <text
                x={r.x}
                y={r.baseline}
                fontFamily={FONT_FAMILIES[r.font]}
                fontSize={fontSizeMm(r.size)}
                fill={r.color}
                style={{ userSelect: "none" }}
              >
                {r.text}
              </text>
            </g>
          ))}
        </g>
      ))}
      {run && selection && (
        <g
          data-testid="transform-frame"
          fill="var(--background)"
          stroke="var(--primary)"
          strokeWidth={1.5 * unit}
        >
          <rect
            x={run.cx - selection.halfWidth}
            y={run.cy - selection.halfHeight}
            width={2 * selection.halfWidth}
            height={2 * selection.halfHeight}
            rx={3 * unit}
            fill="none"
            pointerEvents="none"
          />
          <line
            x1={run.cx}
            y1={run.cy - selection.halfHeight}
            x2={run.cx}
            y2={run.cy - selection.halfHeight - selection.turnGap}
            pointerEvents="none"
          />
          {[
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
            [0, 0],
          ].map(([x, y], i) => {
            const turn = i === 4,
              cx = run.cx + x * selection.halfWidth,
              cy = turn
                ? run.cy - selection.halfHeight - selection.turnGap
                : run.cy + y * selection.halfHeight;
            return (
              <g
                key={i}
                role="button"
                tabIndex={0}
                aria-label={
                  turn
                    ? "Girar elemento en el lienzo"
                    : `Cambiar tamaño desde esquina ${i + 1}`
                }
                data-testid={turn ? "rotation-handle" : `resize-handle-${i}`}
                style={{
                  cursor: turn
                    ? "grab"
                    : x === y
                      ? "nwse-resize"
                      : "nesw-resize",
                  touchAction: "none",
                }}
                onPointerDown={(event) =>
                  start(event, run.id, turn ? "turn" : "size")
                }
                onKeyDown={(event) => {
                  if (
                    [
                      "ArrowUp",
                      "ArrowRight",
                      "ArrowDown",
                      "ArrowLeft",
                    ].includes(event.key)
                  ) {
                    event.preventDefault();
                    const direction =
                      event.key === "ArrowUp" || event.key === "ArrowRight"
                        ? 1
                        : -1;
                    onTransform?.(
                      page.face,
                      run.id,
                      turn
                        ? {
                            rotation: ((run.rotation + direction * 90 + 360) %
                              360) as Rotation,
                          }
                        : { size: run.size + direction },
                    );
                  }
                }}
              >
                <rect
                  x={cx - selection.hit / 2}
                  y={cy - selection.hit / 2}
                  width={selection.hit}
                  height={selection.hit}
                  fill="transparent"
                  stroke="none"
                />
                {turn ? (
                  <>
                    <circle cx={cx} cy={cy} r={11 * unit} />
                    <path
                      d={`M ${cx - 4 * unit} ${cy + 3 * unit} a ${5 * unit} ${5 * unit} 0 1 1 ${8 * unit} 0 m 0 ${-4 * unit} v ${4 * unit} h ${-4 * unit}`}
                      fill="none"
                      pointerEvents="none"
                    />
                  </>
                ) : (
                  <rect
                    x={cx - 5 * unit}
                    y={cy - 5 * unit}
                    width={10 * unit}
                    height={10 * unit}
                    rx={2 * unit}
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}
