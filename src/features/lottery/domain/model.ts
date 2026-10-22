export type Face = "front" | "back";
export type FontId = "sans" | "mono";
interface ElementPosition {
  id: string;
  x: number;
  y: number;
  color: string;
}
export type Rotation = 0 | 90 | 180 | 270;
export interface TextElement extends ElementPosition {
  kind: "sequence" | "text";
  text: string;
  size: number;
  font: FontId;
  rotation?: Rotation;
}
export interface CoverElement extends ElementPosition {
  kind: "cover";
  width: number;
  height: number;
}
export type TicketElement = TextElement | CoverElement;
export interface Project {
  mode: "single" | "duplex";
  numbered: "front" | "back" | "both";
  sequence: {
    start: number;
    end: number;
    pad: number;
    prefix: string;
    suffix: string;
  };
  layout: {
    paper: "letter" | "a4" | "oficio" | "legal" | "custom";
    width: number;
    height: number;
    orientation: "portrait" | "landscape";
    rows: number;
    columns: number;
    margin: number;
    gapX: number;
    gapY: number;
    sizing: "auto" | "manual";
    cardWidth: number;
    flip: "long" | "short";
  };
  elements: Record<Face, TicketElement[]>;
}
export interface ImageInfo {
  width: number;
  height: number;
}
export type ImageInfos = Partial<Record<Face, ImageInfo>>;
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Layout {
  width: number;
  height: number;
  cardWidth: number;
  cardHeight: number;
  left: number;
  top: number;
  perSheet: number;
  count: number;
  sheets: number;
  pages: number;
}
export interface CardPlan extends Rect {
  number: number;
  label: string;
  image: Rect;
  elements: Array<TicketElement & { value: string }>;
}
export interface PagePlan {
  index: number;
  face: Face;
  width: number;
  height: number;
  cards: CardPlan[];
}
export const LIMITS = {
  imageBytes: 20 * 1024 * 1024,
  imagePixels: 20_000_000,
  imageSide: 10_000,
  pdfPages: 500,
  tickets: 5000,
  pages: 500,
  rasterPixels: 32_000_000,
  outputBytes: 128 * 1024 * 1024,
  paperMin: 50,
  paperMax: 600,
} as const;
export const PAPERS = {
  letter: { label: "Carta", width: 215.9, height: 279.4 },
  a4: { label: "A4", width: 210, height: 297 },
  oficio: { label: "Oficio (13 pulgadas)", width: 215.9, height: 330.2 },
  legal: { label: "Legal (14 pulgadas)", width: 215.9, height: 355.6 },
} as const;
export const DEFAULT_PROJECT: Project = {
  mode: "single",
  numbered: "front",
  sequence: { start: 1, end: 100, pad: 3, prefix: "", suffix: "" },
  layout: {
    paper: "letter",
    width: 215.9,
    height: 279.4,
    orientation: "portrait",
    rows: 3,
    columns: 3,
    margin: 10,
    gapX: 3,
    gapY: 3,
    sizing: "auto",
    cardWidth: 60,
    flip: "long",
  },
  elements: {
    front: [
      {
        id: "front-number",
        kind: "sequence",
        text: "",
        x: 0.5,
        y: 0.75,
        size: 14,
        font: "mono",
        color: "#172d24",
      },
    ],
    back: [
      {
        id: "back-number",
        kind: "sequence",
        text: "",
        x: 0.5,
        y: 0.75,
        size: 14,
        font: "mono",
        color: "#172d24",
      },
    ],
  },
};
export const mmToPt = (mm: number) => (mm * 72) / 25.4;
export const ptToMm = (pt: number) => (pt * 25.4) / 72;
export const mmToPx = (mm: number, dpi: number) =>
  Math.round((mm * dpi) / 25.4);
