"use client";
import { Minus, Plus, RotateCcw, RotateCw, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { TextElement } from "../domain/model";
import type { ElementPatch } from "../application/element-transforms";

export function TransformToolbar({
  element,
  disabled,
  duplicateAllowed,
  removeAllowed,
  onChange,
  onDuplicate,
  onRemove,
  message,
}: {
  element: TextElement;
  disabled: boolean;
  duplicateAllowed: boolean;
  removeAllowed: boolean;
  onChange: (patch: ElementPatch) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  message: string;
}) {
  const actions = [
    {
      label: "Reducir tamaño",
      icon: Minus,
      disabled: element.size <= 6,
      run: () => onChange({ size: element.size - 1 }),
    },
    {
      label: "Aumentar tamaño",
      icon: Plus,
      disabled: element.size >= 72,
      run: () => onChange({ size: element.size + 1 }),
    },
    {
      label: "Girar a la izquierda",
      icon: RotateCcw,
      disabled: false,
      run: () =>
        onChange({
          rotation: (((element.rotation ?? 0) + 270) % 360) as
            0 | 90 | 180 | 270,
        }),
    },
    {
      label: "Girar a la derecha",
      icon: RotateCw,
      disabled: false,
      run: () =>
        onChange({
          rotation: (((element.rotation ?? 0) + 90) % 360) as
            0 | 90 | 180 | 270,
        }),
    },
    {
      label: "Duplicar selección",
      icon: Copy,
      disabled: !duplicateAllowed,
      run: onDuplicate,
    },
    {
      label: "Eliminar selección",
      icon: Trash2,
      disabled: !removeAllowed,
      run: onRemove,
    },
  ];
  return (
    <div
      className="flex flex-col gap-2 border-y bg-background p-3"
      data-testid="transform-toolbar"
    >
      <div
        role="group"
        aria-label="Acciones del elemento"
        className="flex flex-wrap items-center gap-1"
      >
        <Badge variant="secondary">
          {element.size} pt · {element.rotation ?? 0}°
        </Badge>
        {actions.map(({ label, icon: Icon, disabled: unavailable, run }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="min-h-11 min-w-11"
                aria-label={label}
                disabled={disabled || unavailable}
                onClick={run}
              >
                <Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Arrastra el número para moverlo, las esquinas para cambiar su tamaño y
        el círculo para girarlo. Escape cancela el gesto.
      </p>
      <p
        role="status"
        aria-live="polite"
        className="min-h-4 text-xs text-muted-foreground"
      >
        {message}
      </p>
    </div>
  );
}
