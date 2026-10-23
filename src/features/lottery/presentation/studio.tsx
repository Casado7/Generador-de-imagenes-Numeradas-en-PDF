"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  FileImage,
  Heart,
  ImagePlus,
  Layers,
  LockKeyhole,
  Printer,
  Ticket,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  calculateLayout,
  effectiveDpi,
  fitImage,
  formatNumber,
  planPage,
  faceIsNumbered,
} from "../domain/composition";
import {
  DEFAULT_PROJECT,
  type Face,
  type Layout,
  type Project,
} from "../domain/model";
import { prepareProject, renderPage } from "../application/compose";
import type {
  ExportFormat,
  ExportProgress,
  FontMetrics,
} from "../application/ports";
import {
  createFontResources,
  loadCanvasFonts,
  type FontBytes,
} from "../infrastructure/fonts";
import {
  readLocalImage,
  releaseImage,
  type LocalImage,
} from "../infrastructure/images";
import { projectSchema } from "../infrastructure/validation";
import {
  BrowserExporter,
  downloadResult,
} from "../infrastructure/browser-exporter";
import { Settings } from "./settings";
import { Properties } from "./properties";
import { PreviewCanvas } from "./canvas";
import { Choice } from "./controls";
import { TransformToolbar } from "./transform-toolbar";
import { canDuplicate, canRemove } from "./element-actions";
import {
  constrainTransform,
  textEnvelope,
  type ElementPatch,
} from "../application/element-transforms";

function makeExample(): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 600;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f6f1df";
  ctx.fillRect(0, 0, 1200, 600);
  ctx.fillStyle = "#24664e";
  ctx.fillRect(0, 0, 1200, 22);
  ctx.fillRect(0, 578, 1200, 22);
  ctx.font = "24px sans-serif";
  ctx.fillText("JUNTOS HACEMOS LA DIFERENCIA", 60, 90);
  ctx.font = "bold 76px sans-serif";
  ctx.fillText("Una pequeña ayuda.", 60, 210);
  ctx.fillText("Una gran oportunidad.", 60, 300);
  ctx.font = "27px sans-serif";
  ctx.fillText("RIFA BENÉFICA  /  TU FUNDACIÓN", 60, 370);
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = "#24664e";
  ctx.beginPath();
  ctx.moveTo(950, 22);
  ctx.lineTo(950, 578);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = "20px sans-serif";
  ctx.fillText("TALÓN", 1010, 90);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(60, 420, 260, 95);
  ctx.fillRect(980, 420, 180, 95);
  return new Promise((resolve) =>
    canvas.toBlob((blob) => {
      canvas.width = 0;
      canvas.height = 0;
      resolve(new File([blob!], "ejemplo-rifa.png", { type: "image/png" }));
    }, "image/png"),
  );
}

export function Studio() {
  const form = useForm<Project>({
    defaultValues: structuredClone(DEFAULT_PROJECT),
    resolver: zodResolver(projectSchema),
    mode: "onChange",
  });
  const [project, setProject] = useState<Project>(() =>
    structuredClone(DEFAULT_PROJECT),
  );
  const [inputsValid, setInputsValid] = useState(true);
  const [images, setImages] = useState<Partial<Record<Face, LocalImage>>>({});
  const imagesRef = useRef(images);
  const uploads = useRef<Record<Face, number>>({ front: 0, back: 0 });
  const [loadingImages, setLoadingImages] = useState(0);
  const [fonts, setFonts] = useState<{
    bytes: FontBytes;
    metrics: FontMetrics;
  } | null>(null);
  const [fontError, setFontError] = useState("");
  const [face, setFace] = useState<Face>("front"),
    [selected, setSelected] = useState<string | null>("front-number");
  const [view, setView] = useState("ticket"),
    [zoom, setZoom] = useState(100),
    [pageIndex, setPageIndex] = useState(0);
  const [transformMessage, setTransformMessage] = useState("");
  const [sample, setSample] = useState(1),
    [format, setFormat] = useState<ExportFormat>("pdf"),
    [dpi, setDpi] = useState<150 | 300>(150);
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState<ExportProgress | null>(null);
  const exporter = useRef<BrowserExporter | null>(null);
  const draft = useWatch({ control: form.control });
  useEffect(() => {
    const parsed = projectSchema.safeParse(draft);
    setInputsValid(parsed.success);
    if (parsed.success) setProject(parsed.data);
  }, [draft]);
  useEffect(() => {
    let live = true;
    createFontResources()
      .then(async (resources) => {
        await loadCanvasFonts(resources.bytes, document.fonts);
        if (live) setFonts(resources);
      })
      .catch((e) => {
        if (live)
          setFontError(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar las fuentes.",
          );
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(
    () => () => {
      uploads.current.front++;
      uploads.current.back++;
      Object.values(imagesRef.current).forEach(releaseImage);
      exporter.current?.cancel();
    },
    [],
  );
  useEffect(() => {
    if (project.mode === "single") setFace("front");
  }, [project.mode]);
  const activeFace = project.mode === "single" ? "front" : face;
  const selectedElement = project.elements[activeFace].find(
    (e) => e.id === selected,
  );
  const info = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(images).map(([key, image]) => [
          key,
          { width: image.width, height: image.height },
        ]),
      ),
    [images],
  );
  const analysis = useMemo((): { layout: Layout | null; error: string } => {
    let layout: Layout | null = null;
    try {
      layout = calculateLayout(project, info);
      if (fonts) prepareProject(project, info, fonts.metrics);
      return { layout, error: "" };
    } catch (e) {
      return {
        layout,
        error: e instanceof Error ? e.message : "Revisa la configuración.",
      };
    }
  }, [project, info, fonts]);
  const layout = analysis.layout;
  const page = layout ? Math.min(pageIndex, layout.pages - 1) : 0;
  const sampleNumber = Math.max(
    project.sequence.start,
    Math.min(project.sequence.end, sample),
  );
  const preview = useMemo(() => {
    if (!layout || !fonts || !images[activeFace]) return null;
    try {
      if (view === "sheet")
        return renderPage(planPage(project, info, layout, page), fonts.metrics);
      const cardImage = fitImage(info[activeFace]!, {
        x: 0,
        y: 0,
        width: layout.cardWidth,
        height: layout.cardHeight,
      });
      const seed = planPage(
        project,
        info,
        layout,
        activeFace === "back" && project.mode === "duplex" ? 1 : 0,
      ).cards[0];
      const label = formatNumber(sampleNumber, project.sequence);
      return renderPage(
        {
          index: 0,
          face: activeFace,
          width: layout.cardWidth,
          height: layout.cardHeight,
          cards: [
            {
              ...seed,
              x: 0,
              y: 0,
              width: layout.cardWidth,
              height: layout.cardHeight,
              number: sampleNumber,
              label,
              image: cardImage,
              elements: seed.elements.map((e) => ({
                ...e,
                value:
                  e.kind === "sequence"
                    ? label
                    : e.kind === "text"
                      ? e.text
                      : "",
              })),
            },
          ],
        },
        fonts.metrics,
      );
    } catch {
      return null;
    }
  }, [
    layout,
    fonts,
    activeFace,
    images,
    view,
    project,
    info,
    page,
    sampleNumber,
  ]);
  const lowDpi =
    layout &&
    Object.entries(info)
      .filter(([key]) => key === "front" || project.mode === "duplex")
      .some(([, value]) => effectiveDpi(value, layout) < 150);
  const canExport =
    !!layout &&
    !!fonts &&
    !analysis.error &&
    inputsValid &&
    !busy &&
    loadingImages === 0;
  async function onFile(which: Face, file: File, page = 1) {
    const revision = ++uploads.current[which];
    setLoadingImages((n) => n + 1);
    try {
      const image = await readLocalImage(file, page);
      if (uploads.current[which] !== revision) {
        releaseImage(image);
        return;
      }
      releaseImage(imagesRef.current[which]);
      const next = { ...imagesRef.current, [which]: image };
      imagesRef.current = next;
      setImages(next);
      toast.success(
        image.pdf
          ? `PDF listo: página ${image.pdf.page} de ${image.pdf.pages}.`
          : "Imagen lista para editar.",
      );
    } finally {
      setLoadingImages((n) => n - 1);
    }
  }
  async function example() {
    try {
      await onFile("front", await makeExample());
      const first = {
        ...DEFAULT_PROJECT.elements.front[0],
        x: 0.16,
        y: 0.78,
        size: 12,
      };
      form.setValue(
        "elements.front",
        [first, { ...first, id: "sample-talon", x: 0.89 }],
        { shouldValidate: true },
      );
      setSelected(first.id);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo cargar el ejemplo.",
      );
    }
  }
  function transform(
    which: Face,
    id: string,
    patch: ElementPatch,
    restore = false,
  ) {
    if ((busy && !restore) || !layout || !fonts) return;
    const list = form.getValues(`elements.${which}`);
    const element = list.find((e) => e.id === id);
    if (!element) return;
    try {
      const result = restore
        ? { element: { ...element, ...patch }, reason: "" }
        : constrainTransform(
            element,
            patch,
            layout.cardWidth,
            layout.cardHeight,
            element.kind !== "cover"
              ? textEnvelope(element, project.sequence, fonts.metrics)
              : undefined,
          );
      setTransformMessage(result.reason);
      form.setValue(
        `elements.${which}`,
        list.map((e) => (e.id === id ? result.element : e)),
        { shouldValidate: true, shouldDirty: true },
      );
    } catch (e) {
      setTransformMessage(
        e instanceof Error ? e.message : "No se pudo ajustar la marca.",
      );
    }
  }
  function duplicate(id: string) {
    if (busy || !layout || !fonts) return;
    const list = form.getValues(`elements.${activeFace}`),
      element = list.find((e) => e.id === id);
    if (!element || !canDuplicate(element, list)) return;
    try {
      const moved = constrainTransform(
        element,
        { x: Math.min(0.85, element.x + 0.1) },
        layout.cardWidth,
        layout.cardHeight,
        element.kind !== "cover"
          ? textEnvelope(element, project.sequence, fonts.metrics)
          : undefined,
      ).element;
      const next = { ...moved, id: crypto.randomUUID() };
      form.setValue(`elements.${activeFace}`, [...list, next], {
        shouldValidate: true,
        shouldDirty: true,
      });
      setSelected(next.id);
      setTransformMessage("");
    } catch (e) {
      setTransformMessage(
        e instanceof Error ? e.message : "No se pudo duplicar la marca.",
      );
    }
  }
  function remove(id: string) {
    if (busy) return;
    const list = form.getValues(`elements.${activeFace}`),
      element = list.find((e) => e.id === id);
    if (
      !element ||
      !canRemove(element, list, faceIsNumbered(project, activeFace))
    )
      return;
    form.setValue(
      `elements.${activeFace}`,
      list.filter((e) => e.id !== id),
      { shouldValidate: true, shouldDirty: true },
    );
    setSelected(null);
    setTransformMessage("");
  }
  async function generate() {
    if (!canExport || !fonts) return;
    const service = new BrowserExporter(images, fonts.bytes);
    exporter.current = service;
    setBusy(true);
    setProgress({ stage: "preparing", done: 0, total: layout!.pages });
    try {
      const result = await service.start(
        { project, images: info, format, dpi },
        setProgress,
      );
      downloadResult(result);
      toast.success("Archivo generado. La descarga está lista.");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError")
        toast("Generación cancelada.");
      else
        toast.error(
          e instanceof Error
            ? e.message
            : "No se pudo generar el archivo. Reduce el rango o la resolución.",
        );
    } finally {
      exporter.current = null;
      setBusy(false);
      setProgress(null);
    }
  }
  const urls = Object.fromEntries(
    Object.entries(images).map(([key, value]) => [key, value.url]),
  );
  return (
    <TooltipProvider>
      <div className="min-h-screen">
        <header className="border-b bg-card">
          <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 px-5 py-4 lg:px-8">
            <Link
              href="/"
              className="flex items-center gap-3"
              aria-label="Rifa Estudio, inicio"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Ticket className="size-6" />
              </div>
              <div>
                <span className="text-lg font-semibold tracking-tight">
                  rifa
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    estudio
                  </span>
                </span>
                <p className="text-[10px] font-medium uppercase tracking-[.18em] text-muted-foreground">
                  Diseña. Numera. Comparte.
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="hidden gap-2 sm:flex">
                <LockKeyhole className="size-3" />
                Tus archivos se quedan contigo
              </Badge>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <CircleHelp data-icon="inline-start" />
                    Ayuda
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Del diseño a la impresión</SheetTitle>
                    <SheetDescription>
                      Prepara tus boletos en unos pasos.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col gap-5 p-6 text-sm">
                    <p>
                      <strong>1. Carga tu diseño.</strong> Usa PNG, JPG o PDF.
                      Elige una página del PDF como boleto completo. Puedes
                      elegir una cara o frente/reverso.
                    </p>
                    <p>
                      <strong>2. Coloca los números.</strong> Arrástralos sobre
                      la tarjeta o usa las coordenadas. Añade otro número para
                      un talón, o textos fijos. Cambia el giro para escribir en
                      vertical.
                    </p>
                    <p>
                      <strong>Cubre los números antiguos.</strong> Añade una
                      cobertura, ajusta su color y sus dimensiones, y coloca el
                      número nuevo encima. La cobertura es visual: no borra el
                      contenido original del PDF.
                    </p>
                    <p>
                      <strong>3. Ajusta la hoja.</strong> Elige papel, ancho del
                      boleto, filas, columnas y separaciones. Revisa la última
                      página.
                    </p>
                    <p>
                      <strong>4. Descarga e imprime.</strong> Usa escala 100 % /
                      tamaño real y desactiva “ajustar a página”. En dúplex,
                      selecciona el mismo borde de giro que en la aplicación y
                      prueba primero una hoja.
                    </p>
                    <Separator />
                    <p>
                      La sesión se pierde al recargar. No se suben ni guardan
                      tus imágenes o configuración.
                    </p>
                    <p>
                      Límites: 20 MiB y 20 MP por imagen, 5000 boletos, 500
                      páginas, papel de 50 a 600 mm por lado, raster de 32 MP y
                      salida de 128 MiB. Si un trabajo no cabe, reduce el rango
                      o la resolución.
                    </p>
                    <p>
                      PDF conserva texto vectorial. PNG ofrece 150 o 300 ppp.
                      “Ambos” entrega un ZIP con PDF y todas las hojas.
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>
        <main className="mx-auto flex max-w-[1800px] flex-col gap-7 px-4 py-7 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[.2em] text-primary">
                PEQUEÑOS BOLETOS, GRANDES CAUSAS
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Tu diseño. Miles de oportunidades.
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Dale forma a tu próxima rifa, sin complicaciones.
              </p>
            </div>
            <Badge variant="outline" className="gap-2">
              <Heart className="size-3" />
              Hecho para ayudar
            </Badge>
          </div>
          <form onSubmit={form.handleSubmit(() => void generate())} noValidate>
            <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
              <legend className="sr-only">Configuración de los boletos</legend>
              <div className="grid items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)_280px] 2xl:grid-cols-[320px_minmax(0,1fr)_300px]">
                <aside aria-label="Configuración del diseño">
                  <Settings
                    form={form}
                    project={project}
                    images={images}
                    onFile={onFile}
                    busy={busy}
                  />
                </aside>
                <section
                  className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-5"
                  aria-label="Área de diseño"
                >
                  <Tabs value={view} onValueChange={setView}>
                    <Card className="overflow-hidden">
                      <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <CardTitle>Tu mesa de trabajo</CardTitle>
                            <CardDescription>
                              Así se verá al imprimir.
                            </CardDescription>
                          </div>
                          <TabsList>
                            <TabsTrigger value="ticket">
                              <Ticket className="size-4" />
                              Boleto
                            </TabsTrigger>
                            <TabsTrigger value="sheet">
                              <Layers className="size-4" />
                              Hoja
                            </TabsTrigger>
                          </TabsList>
                        </div>
                      </CardHeader>
                      <TabsContent value={view}>
                        <CardContent className="p-0">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-y px-5 py-3">
                            <ToggleGroup
                              type="single"
                              value={activeFace}
                              variant="outline"
                              size="sm"
                              disabled={
                                busy ||
                                project.mode === "single" ||
                                view === "sheet"
                              }
                              aria-label="Cara que estás editando"
                              onValueChange={(v) => {
                                if (v) {
                                  setFace(v as Face);
                                  setSelected(null);
                                }
                              }}
                            >
                              <ToggleGroupItem value="front">
                                Frente
                              </ToggleGroupItem>
                              <ToggleGroupItem value="back">
                                Reverso
                              </ToggleGroupItem>
                            </ToggleGroup>
                            <Field orientation="horizontal" className="w-auto">
                              <FieldLabel htmlFor="zoom">Zoom</FieldLabel>
                              <Input
                                id="zoom"
                                type="number"
                                min={50}
                                max={200}
                                step={10}
                                className="w-20"
                                value={zoom}
                                onChange={(e) =>
                                  setZoom(
                                    Math.max(
                                      50,
                                      Math.min(
                                        200,
                                        Number(e.target.value) || 100,
                                      ),
                                    ),
                                  )
                                }
                              />
                              <span className="text-xs text-muted-foreground">
                                %
                              </span>
                            </Field>
                          </div>
                          {view === "ticket" &&
                            selectedElement &&
                            selectedElement.kind !== "cover" && (
                              <TransformToolbar
                                element={selectedElement}
                                disabled={busy || !inputsValid || !fonts}
                                duplicateAllowed={canDuplicate(
                                  selectedElement,
                                  project.elements[activeFace],
                                )}
                                removeAllowed={canRemove(
                                  selectedElement,
                                  project.elements[activeFace],
                                  faceIsNumbered(project, activeFace),
                                )}
                                onChange={(patch) =>
                                  transform(
                                    activeFace,
                                    selectedElement.id,
                                    patch,
                                  )
                                }
                                onDuplicate={() =>
                                  duplicate(selectedElement.id)
                                }
                                onRemove={() => remove(selectedElement.id)}
                                message={transformMessage}
                              />
                            )}
                          <div
                            className="editor-grid flex min-h-[410px] items-center overflow-auto px-16 pb-16 pt-32 sm:min-h-[500px]"
                            data-testid="workspace"
                          >
                            {preview ? (
                              <div
                                className="mx-auto shrink-0"
                                style={{
                                  width: `${((view === "ticket" ? 90 : 64) * zoom) / 100}%`,
                                  minWidth: 200,
                                }}
                              >
                                <PreviewCanvas
                                  key={`${activeFace}-${view}`}
                                  page={preview}
                                  urls={urls}
                                  editable={view === "ticket" && !busy}
                                  selected={selected}
                                  onSelect={(id) => {
                                    setSelected(id);
                                    setTransformMessage("");
                                  }}
                                  onTransform={transform}
                                />
                              </div>
                            ) : (
                              <Empty className="mx-auto max-w-md border-0">
                                <EmptyHeader>
                                  <EmptyMedia variant="icon">
                                    <ImagePlus />
                                  </EmptyMedia>
                                  <EmptyTitle>
                                    Todo empieza con tu diseño
                                  </EmptyTitle>
                                  <EmptyDescription>
                                    Carga la imagen de tu boleto y coloca la
                                    numeración justo donde la necesitas.
                                  </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                      document
                                        .getElementById("image-front")
                                        ?.click()
                                    }
                                    disabled={busy}
                                  >
                                    <ImagePlus data-icon="inline-start" />
                                    Elegir mi diseño
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => void example()}
                                    disabled={busy || loadingImages > 0}
                                  >
                                    O prueba con un ejemplo{" "}
                                    <ArrowRight data-icon="inline-end" />
                                  </Button>
                                </EmptyContent>
                              </Empty>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t py-3">
                          {view === "ticket" ? (
                            <Field orientation="horizontal" className="w-auto">
                              <FieldLabel htmlFor="sample">
                                Número de muestra
                              </FieldLabel>
                              <Input
                                id="sample"
                                type="number"
                                min={project.sequence.start}
                                max={project.sequence.end}
                                value={sampleNumber}
                                className="w-24"
                                onChange={(e) =>
                                  setSample(Number(e.target.value))
                                }
                              />
                            </Field>
                          ) : (
                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                aria-label="Página anterior"
                                disabled={!layout || page === 0}
                                onClick={() => setPageIndex(page - 1)}
                              >
                                <ArrowLeft />
                              </Button>
                              <span className="text-sm">
                                {layout
                                  ? `${page + 1} / ${layout.pages}`
                                  : "Sin páginas"}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                aria-label="Página siguiente"
                                disabled={!layout || page >= layout.pages - 1}
                                onClick={() => setPageIndex(page + 1)}
                              >
                                <ArrowRight />
                              </Button>
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {view === "ticket"
                              ? "Arrastra un elemento para moverlo"
                              : preview?.face === "back"
                                ? "Reverso · listo para dúplex"
                                : "Vista de impresión"}
                          </span>
                        </CardFooter>
                      </TabsContent>
                    </Card>
                  </Tabs>
                  {fontError && (
                    <Alert variant="destructive">
                      <AlertTitle>No se cargaron las fuentes</AlertTitle>
                      <AlertDescription>
                        {fontError} Recarga la página para volver a intentarlo.
                      </AlertDescription>
                    </Alert>
                  )}
                  {!inputsValid && (
                    <Alert variant="destructive">
                      <AlertTitle>Revisa los campos indicados</AlertTitle>
                      <AlertDescription>
                        La vista previa conserva el último ajuste válido.
                        Corrige los campos para descargar.
                      </AlertDescription>
                    </Alert>
                  )}
                  {!!images.front && !!analysis.error && (
                    <Alert variant="destructive">
                      <AlertTitle>Un ajuste necesita tu atención</AlertTitle>
                      <AlertDescription>{analysis.error}</AlertDescription>
                    </Alert>
                  )}
                  {lowDpi && (
                    <Alert>
                      <FileImage />
                      <AlertTitle>Tu imagen podría verse pixelada</AlertTitle>
                      <AlertDescription>
                        La resolución efectiva es inferior a 150 ppp. Reducir el
                        tamaño del boleto o usar una imagen más grande mejorará
                        la impresión.
                      </AlertDescription>
                    </Alert>
                  )}
                  {project.mode === "duplex" && (
                    <Alert>
                      <Printer />
                      <AlertTitle>Haz una prueba de una hoja</AlertTitle>
                      <AlertDescription>
                        Imprime al 100 % y con giro por borde{" "}
                        {project.layout.flip === "long" ? "largo" : "corto"}.
                        Los reversos ya están colocados para ese giro.
                      </AlertDescription>
                    </Alert>
                  )}
                </section>
                <aside
                  className="flex flex-col gap-5"
                  aria-label="Elementos y descarga"
                >
                  <Properties
                    form={form}
                    project={project}
                    face={activeFace}
                    selected={selected}
                    onDuplicate={duplicate}
                    onRemove={remove}
                    onSelect={setSelected}
                    busy={busy}
                  />
                  <Card>
                    <CardHeader>
                      <CardTitle>Listo para compartir</CardTitle>
                      <CardDescription>
                        Tu próxima buena causa empieza aquí.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FieldGroup>
                        <dl className="summary-list">
                          <div>
                            <dt>Boletos</dt>
                            <dd>{layout?.count ?? "—"}</dd>
                          </div>
                          <div>
                            <dt>Por hoja</dt>
                            <dd>
                              {layout?.perSheet ??
                                project.layout.rows * project.layout.columns}
                            </dd>
                          </div>
                          <div>
                            <dt>Hojas / páginas</dt>
                            <dd>
                              {layout
                                ? `${layout.sheets} / ${layout.pages}`
                                : "—"}
                            </dd>
                          </div>
                          <div>
                            <dt>Tamaño del boleto</dt>
                            <dd>
                              {layout
                                ? `${layout.cardWidth.toFixed(1)} × ${layout.cardHeight.toFixed(1)} mm`
                                : "—"}
                            </dd>
                          </div>
                          <div>
                            <dt>Papel</dt>
                            <dd>
                              {layout
                                ? `${layout.width.toFixed(1)} × ${layout.height.toFixed(1)} mm`
                                : "—"}
                            </dd>
                          </div>
                        </dl>
                        <Separator />
                        <Field>
                          <FieldLabel id="format-label">
                            Descargar como
                          </FieldLabel>
                          <ToggleGroup
                            type="single"
                            variant="outline"
                            value={format}
                            aria-labelledby="format-label"
                            disabled={busy}
                            onValueChange={(v) =>
                              v && setFormat(v as ExportFormat)
                            }
                            className="w-full"
                          >
                            <ToggleGroupItem value="pdf" className="flex-1">
                              PDF
                            </ToggleGroupItem>
                            <ToggleGroupItem value="images" className="flex-1">
                              PNG
                            </ToggleGroupItem>
                            <ToggleGroupItem value="both" className="flex-1">
                              Ambos
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </Field>
                        {format !== "pdf" && (
                          <Choice
                            label="Resolución de imágenes"
                            value={String(dpi)}
                            options={[
                              ["150", "150 ppp · archivo más ligero"],
                              ["300", "300 ppp · mayor resolución"],
                            ]}
                            onChange={(v) => setDpi(Number(v) as 150 | 300)}
                            disabled={busy}
                          />
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format === "pdf"
                            ? "Un PDF con todas las páginas, listo para imprimir al tamaño real."
                            : format === "images"
                              ? "Un ZIP con todas las hojas como imágenes PNG."
                              : "Un ZIP con el PDF y todas las hojas PNG."}
                        </p>
                      </FieldGroup>
                    </CardContent>
                    <CardFooter className="flex-col items-stretch gap-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={!canExport}
                            >
                              <ArrowDownToLine data-icon="inline-start" />
                              Generar {format === "pdf" ? "PDF" : "archivos"}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {canExport
                            ? "Generar en este dispositivo"
                            : "Completa un diseño válido para descargar"}
                        </TooltipContent>
                      </Tooltip>
                      <p className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                        <LockKeyhole className="size-3" />
                        Sin subir archivos. Sin registro.
                      </p>
                    </CardFooter>
                  </Card>
                </aside>
              </div>
            </fieldset>
          </form>
          {busy && progress && (
            <Card role="status" aria-live="polite">
              <CardContent className="flex flex-wrap items-center gap-5 py-5">
                <div className="min-w-48 flex-1">
                  <p className="mb-2 text-sm font-medium">
                    {progress.stage === "preparing"
                      ? "Preparando tu diseño…"
                      : progress.stage === "packing"
                        ? "Preparando la descarga…"
                        : `Generando página ${progress.done} de ${progress.total}`}
                  </p>
                  <Progress
                    value={
                      progress.stage === "packing"
                        ? 98
                        : Math.round((progress.done / progress.total) * 95)
                    }
                    aria-label="Progreso de generación"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => exporter.current?.cancel()}
                >
                  <X data-icon="inline-start" />
                  Cancelar
                </Button>
              </CardContent>
            </Card>
          )}
          <footer className="flex flex-wrap items-center justify-between gap-3 py-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <LockKeyhole className="size-3" />
              Tu trabajo vive en esta pestaña. Al recargar, la sesión se
              reinicia.
            </p>
            <p className="flex items-center gap-2">
              <Check className="size-3" />
              Hecho con cuidado, para buenas causas.
            </p>
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}
