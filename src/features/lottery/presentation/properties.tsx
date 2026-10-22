"use client";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Copy, Hash, Plus, Trash2, Type, Square } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Choice, NumberField, TextField } from "./controls";
import type { Face, Project, TicketElement, Rotation } from "../domain/model";
import { faceIsNumbered } from "../domain/composition";

export function Properties({
  form,
  project,
  face,
  selected,
  onSelect,
  busy,
}: {
  form: UseFormReturn<Project>;
  project: Project;
  face: Face;
  selected: string | null;
  onSelect: (id: string | null) => void;
  busy: boolean;
}) {
  const elements = project.elements[face],
    index = elements.findIndex((e) => e.id === selected),
    element = elements[index];
  const path = `elements.${face}` as const;
  function add(kind: TicketElement["kind"], copy?: TicketElement) {
    if (
      elements.filter((e) => e.kind === kind).length >=
      (kind === "cover" ? 8 : 4)
    )
      return;
    const base = {
      id: crypto.randomUUID(),
      x: 0.5,
      y: kind === "text" ? 0.3 : 0.65,
    };
    const next: TicketElement = copy
      ? { ...copy }
      : kind === "cover"
        ? { ...base, kind, width: 0.12, height: 0.08, color: "#ffffff" }
        : {
            ...base,
            kind,
            text: kind === "text" ? "Rifa benéfica" : "",
            size: 12,
            font: "mono",
            color: "#172d24",
            rotation: 0,
          };
    next.id = crypto.randomUUID();
    form.setValue(path, [...elements, next], { shouldValidate: true });
    onSelect(next.id);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personaliza tu boleto</CardTitle>
        <CardDescription>Coloca los elementos sobre tu imagen.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                busy ||
                !faceIsNumbered(project, face) ||
                elements.filter((e) => e.kind === "sequence").length >= 4
              }
              onClick={() => add("sequence")}
            >
              <Hash data-icon="inline-start" />
              Número
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                busy || elements.filter((e) => e.kind === "cover").length >= 8
              }
              onClick={() => add("cover")}
            >
              <Square data-icon="inline-start" /> Cobertura
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                busy || elements.filter((e) => e.kind === "text").length >= 4
              }
              onClick={() => add("text")}
            >
              <Plus data-icon="inline-start" />
              Texto
            </Button>
          </div>
          {!!elements.length && (
            <Choice
              label="Elemento seleccionado"
              value={element?.id ?? "none"}
              options={[
                ["none", "Selecciona un elemento"],
                ...elements
                  .filter(
                    (e) =>
                      e.kind !== "sequence" || faceIsNumbered(project, face),
                  )
                  .map((e, i): [string, string] => [
                    e.id,
                    e.kind === "sequence"
                      ? `Número ${i + 1}`
                      : e.kind === "cover"
                        ? `Cobertura ${elements.filter((item) => item.kind === "cover").findIndex((item) => item.id === e.id) + 1}`
                        : e.text || "Texto vacío",
                  ]),
              ]}
              onChange={(v) => onSelect(v === "none" ? null : v)}
              disabled={busy}
            />
          )}
          {element ? (
            <>
              {element.kind === "text" && (
                <TextField
                  form={form}
                  name={`${path}.${index}.text`}
                  label="Contenido del texto"
                  maxLength={80}
                />
              )}
              {element.kind !== "cover" && (
                <>
                  <Choice
                    label="Tipografía"
                    value={element.font}
                    options={[
                      ["sans", "Noto Sans"],
                      ["mono", "Noto Sans Mono"],
                    ]}
                    onChange={(v) =>
                      form.setValue(
                        `${path}.${index}.font`,
                        v as "sans" | "mono",
                        {
                          shouldValidate: true,
                        },
                      )
                    }
                    disabled={busy}
                  />
                  <Choice
                    label="Giro del elemento"
                    value={String(element.rotation ?? 0)}
                    options={[
                      ["0", "0° · horizontal"],
                      ["90", "90° · vertical hacia abajo"],
                      ["180", "180° · invertido"],
                      ["270", "270° · vertical hacia arriba"],
                    ]}
                    disabled={busy}
                    onChange={(v) =>
                      form.setValue(
                        `${path}.${index}.rotation`,
                        Number(v) as Rotation,
                        { shouldValidate: true },
                      )
                    }
                  />
                </>
              )}
              <FieldGroup className="grid grid-cols-2 gap-3">
                {element.kind !== "cover" && (
                  <NumberField
                    form={form}
                    name={`${path}.${index}.size`}
                    label="Tamaño (pt)"
                    min={6}
                    max={72}
                    step={0.5}
                  />
                )}
                <Field>
                  <FieldLabel htmlFor="element-color">Color</FieldLabel>
                  <Input
                    id="element-color"
                    type="color"
                    className="h-9"
                    {...form.register(`${path}.${index}.color`)}
                  />
                </Field>
              </FieldGroup>
              <FieldGroup className="grid grid-cols-2 gap-3">
                {(element.kind === "cover"
                  ? (["x", "y", "width", "height"] as const)
                  : (["x", "y"] as const)
                ).map((axis) => (
                  <Controller
                    key={`${element.id}-${axis}`}
                    control={form.control}
                    name={`${path}.${index}.${axis}`}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={!!fieldState.error}>
                        <FieldLabel htmlFor={`position-${axis}`}>
                          {axis === "width"
                            ? "Ancho de cobertura (%)"
                            : axis === "height"
                              ? "Alto de cobertura (%)"
                              : `Posición ${axis.toUpperCase()} (%)`}
                        </FieldLabel>
                        <Input
                          id={`position-${axis}`}
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={
                            Number.isFinite(field.value)
                              ? Math.round(field.value * 1000) / 10
                              : ""
                          }
                          onBlur={field.onBlur}
                          ref={field.ref}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? NaN
                                : Number(e.target.value) / 100,
                            )
                          }
                          aria-invalid={!!fieldState.error}
                          aria-describedby={
                            fieldState.error
                              ? `position-${axis}-error`
                              : undefined
                          }
                        />
                        {fieldState.error && (
                          <FieldError id={`position-${axis}-error`}>
                            {fieldState.error.message}
                          </FieldError>
                        )}
                      </Field>
                    )}
                  />
                ))}
              </FieldGroup>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    busy ||
                    elements.filter((e) => e.kind === element.kind).length >=
                      (element.kind === "cover" ? 8 : 4)
                  }
                  onClick={() =>
                    add(element.kind, {
                      ...element,
                      x: Math.min(0.85, element.x + 0.1),
                    })
                  }
                >
                  <Copy data-icon="inline-start" />
                  Duplicar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={
                    busy ||
                    (element.kind === "sequence" &&
                      elements.filter((e) => e.kind === "sequence").length ===
                        1 &&
                      faceIsNumbered(project, face))
                  }
                  onClick={() => {
                    form.setValue(
                      path,
                      elements.filter((e) => e.id !== element.id),
                      { shouldValidate: true },
                    );
                    onSelect(null);
                  }}
                >
                  <Trash2 data-icon="inline-start" />
                  Eliminar
                </Button>
              </div>
            </>
          ) : (
            <Empty className="px-0 py-6">
              <EmptyHeader>
                <Type className="size-6 text-muted-foreground" />
                <EmptyTitle>Todo en su sitio</EmptyTitle>
                <EmptyDescription>
                  Selecciona un número o texto en el boleto para ajustar su
                  apariencia y posición.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
