"use client";
import { useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { ImagePlus, Check, Upload } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { NumberField, TextField, Choice } from "./controls";
import { PAPERS, type Face, type Project } from "../domain/model";
import type { LocalImage } from "../infrastructure/images";

export function ImagePicker({
  face,
  image,
  onFile,
  disabled,
}: {
  face: Face;
  image?: LocalImage;
  onFile: (face: Face, file: File, page?: number) => Promise<void>;
  disabled: boolean;
}) {
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const label = face === "front" ? "Imagen del frente" : "Imagen del reverso";
  async function read(file?: File, page = 1) {
    if (!file || disabled || loading) return;
    setLoading(true);
    setError("");
    try {
      await onFile(face, file, page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer la imagen.");
    } finally {
      setLoading(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <Field data-invalid={!!error} data-disabled={disabled || loading}>
      <FieldLabel htmlFor={`image-${face}`}>{label}</FieldLabel>
      <div
        className="upload-area"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void read(e.dataTransfer.files[0]);
        }}
      >
        {image ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={`Arte del ${face === "front" ? "frente" : "reverso"}`}
              className="size-14 rounded-md object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{image.name}</p>
              <p className="text-xs text-muted-foreground">
                {image.width} × {image.height} px
              </p>
            </div>
            <Check className="size-4 text-primary" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImagePlus className="size-7 text-muted-foreground" />
            <p className="text-sm">Arrastra tu diseño aquí</p>
          </div>
        )}
        <Input
          ref={input}
          id={`image-${face}`}
          data-testid={`image-${face}`}
          type="file"
          accept="image/png,image/jpeg,application/pdf,.pdf"
          disabled={disabled || loading}
          className="hidden"
          aria-invalid={!!error}
          aria-describedby={`image-${face}-help${error ? ` image-${face}-error` : ""}`}
          onChange={(e) => void read(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          disabled={disabled || loading}
          onClick={() => input.current?.click()}
        >
          <Upload data-icon="inline-start" />
          {loading
            ? "Preparando imagen…"
            : image
              ? "Cambiar imagen"
              : "Elegir imagen"}
        </Button>
      </div>
      <FieldDescription id={`image-${face}-help`}>
        PNG, JPG o PDF · hasta 20 MiB. Cada página PDF se usa como un boleto.
      </FieldDescription>
      {image?.pdf && (
        <Choice
          label={`Página PDF del ${face === "front" ? "frente" : "reverso"}`}
          value={String(image.pdf.page)}
          options={Array.from({ length: image.pdf.pages }, (_, i) => [
            String(i + 1),
            `Página ${i + 1} de ${image.pdf!.pages}`,
          ])}
          disabled={disabled || loading || image.pdf.pages === 1}
          onChange={(value) =>
            void read(
              new File([image.pdf!.bytes], image.name, {
                type: "application/pdf",
              }),
              Number(value),
            )
          }
          description="Elige la página que contiene el diseño. El documento permanece en tu navegador."
        />
      )}
      {error && <FieldError id={`image-${face}-error`}>{error}</FieldError>}
    </Field>
  );
}
export function Settings({
  form,
  project,
  images,
  onFile,
  busy,
}: {
  form: UseFormReturn<Project>;
  project: Project;
  images: Partial<Record<Face, LocalImage>>;
  onFile: (face: Face, file: File, page?: number) => Promise<void>;
  busy: boolean;
}) {
  const set = <K extends keyof Project["layout"]>(
    key: K,
    value: Project["layout"][K],
  ) =>
    form.setValue(
      "layout",
      { ...form.getValues("layout"), [key]: value },
      { shouldValidate: true },
    );
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="secondary">01</Badge> Tu diseño
          </CardTitle>
          <CardDescription>Empieza con el arte de tus boletos.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel id="mode-label">Caras del boleto</FieldLabel>
              <ToggleGroup
                type="single"
                value={project.mode}
                variant="outline"
                className="w-full"
                aria-labelledby="mode-label"
                disabled={busy}
                onValueChange={(v) => {
                  if (v)
                    form.setValue("mode", v as Project["mode"], {
                      shouldValidate: true,
                    });
                }}
              >
                <ToggleGroupItem value="single" className="flex-1">
                  Una cara
                </ToggleGroupItem>
                <ToggleGroupItem value="duplex" className="flex-1">
                  Frente y reverso
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <ImagePicker
              face="front"
              image={images.front}
              onFile={onFile}
              disabled={busy}
            />
            {project.mode === "duplex" && (
              <>
                <ImagePicker
                  face="back"
                  image={images.back}
                  onFile={onFile}
                  disabled={busy}
                />
                <Choice
                  label="¿Qué cara lleva número?"
                  value={project.numbered}
                  options={[
                    ["front", "Frente"],
                    ["back", "Reverso"],
                    ["both", "Ambas caras"],
                  ]}
                  onChange={(v) =>
                    form.setValue("numbered", v as Project["numbered"], {
                      shouldValidate: true,
                    })
                  }
                />
              </>
            )}
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="secondary">02</Badge> Numeración
          </CardTitle>
          <CardDescription>
            Una secuencia, tantas copias como necesites.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <FieldGroup className="grid grid-cols-2 gap-3">
              <NumberField
                form={form}
                name="sequence.start"
                label="Desde"
                min={0}
              />
              <NumberField
                form={form}
                name="sequence.end"
                label="Hasta (incluido)"
                min={0}
              />
            </FieldGroup>
            <NumberField
              form={form}
              name="sequence.pad"
              label="Cantidad de dígitos"
              min={1}
              max={9}
            />
            <FieldGroup className="grid grid-cols-2 gap-3">
              <TextField form={form} name="sequence.prefix" label="Prefijo" />
              <TextField form={form} name="sequence.suffix" label="Sufijo" />
            </FieldGroup>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="secondary">03</Badge> La hoja
          </CardTitle>
          <CardDescription>
            Ajusta la distribución para imprimir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Choice
              label="Tamaño de papel"
              value={project.layout.paper}
              options={[
                ...Object.entries(PAPERS).map(
                  ([key, paper]): [string, string] => [
                    key,
                    `${paper.label} · ${paper.width} × ${paper.height} mm`,
                  ],
                ),
                ["custom", "Personalizado"],
              ]}
              onChange={(v) => set("paper", v as Project["layout"]["paper"])}
            />
            {project.layout.paper === "custom" && (
              <FieldGroup className="grid grid-cols-2 gap-3">
                <NumberField
                  form={form}
                  name="layout.width"
                  label="Lado 1 (mm)"
                  min={50}
                  max={600}
                  step={0.1}
                />
                <NumberField
                  form={form}
                  name="layout.height"
                  label="Lado 2 (mm)"
                  min={50}
                  max={600}
                  step={0.1}
                />
              </FieldGroup>
            )}
            <Field>
              <FieldLabel id="orientation-label">Orientación</FieldLabel>
              <ToggleGroup
                type="single"
                aria-labelledby="orientation-label"
                value={project.layout.orientation}
                variant="outline"
                disabled={busy}
                onValueChange={(v) =>
                  v && set("orientation", v as "portrait" | "landscape")
                }
              >
                <ToggleGroupItem value="portrait">Vertical</ToggleGroupItem>
                <ToggleGroupItem value="landscape">Horizontal</ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <Choice
              label="Boletos por hoja"
              value={`${project.layout.rows}x${project.layout.columns}`}
              options={Array.from(
                new Map([
                  ["1x2", "2 · 1 fila × 2 columnas"],
                  ["2x2", "4 · 2 filas × 2 columnas"],
                  ["3x2", "6 · 3 filas × 2 columnas"],
                  ["4x2", "8 · 4 filas × 2 columnas"],
                  ["3x3", "9 · 3 filas × 3 columnas"],
                  ["4x3", "12 · 4 filas × 3 columnas"],
                  [
                    `${project.layout.rows}x${project.layout.columns}`,
                    `${project.layout.rows * project.layout.columns} · ${project.layout.rows} filas × ${project.layout.columns} columnas`,
                  ],
                ]).entries(),
              )}
              onChange={(v) => {
                const [rows, columns] = v.split("x").map(Number);
                set("rows", rows);
                set("columns", columns);
              }}
            />
            <FieldGroup className="grid grid-cols-2 gap-3">
              <NumberField
                form={form}
                name="layout.rows"
                label="Filas"
                min={1}
                max={10}
              />
              <NumberField
                form={form}
                name="layout.columns"
                label="Columnas"
                min={1}
                max={10}
              />
            </FieldGroup>
            <Separator />
            <Choice
              label="Tamaño del boleto"
              value={project.layout.sizing}
              options={[
                ["auto", "Ajustar a la hoja"],
                ["manual", "Elegir ancho en milímetros"],
              ]}
              onChange={(v) => set("sizing", v as "auto" | "manual")}
            />
            {project.layout.sizing === "manual" && (
              <NumberField
                form={form}
                name="layout.cardWidth"
                label="Ancho del boleto (mm)"
                min={5}
                step={0.1}
              />
            )}
            <NumberField
              form={form}
              name="layout.margin"
              label="Margen mínimo (mm)"
              min={0}
              step={0.5}
            />
            <FieldGroup className="grid grid-cols-2 gap-3">
              <NumberField
                form={form}
                name="layout.gapX"
                label="Separación X (mm)"
                min={0}
                step={0.5}
              />
              <NumberField
                form={form}
                name="layout.gapY"
                label="Separación Y (mm)"
                min={0}
                step={0.5}
              />
            </FieldGroup>
            {project.mode === "duplex" && (
              <Choice
                label="Giro de impresión dúplex"
                value={project.layout.flip}
                options={[
                  ["long", "Por borde largo"],
                  ["short", "Por borde corto"],
                ]}
                onChange={(v) => set("flip", v as "long" | "short")}
              />
            )}
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}
