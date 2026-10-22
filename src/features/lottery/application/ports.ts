import type {
  Face,
  FontId,
  ImageInfos,
  PagePlan,
  Project,
  Rect,
  Rotation,
} from "../domain/model";

export interface TextMeasurement {
  width: number;
  ascent: number;
  descent: number;
}
export interface FontMetrics {
  measure(text: string, font: FontId, sizePt: number): TextMeasurement;
}
export interface TextRun {
  text: string;
  x: number;
  baseline: number;
  width: number;
  height: number;
  top: number;
  font: FontId;
  size: number;
  color: string;
  id: string;
  cx: number;
  cy: number;
  rotation: Rotation;
  originX: number;
  originY: number;
}
export interface CoverRun extends Rect {
  id: string;
  color: string;
}
export interface RenderPage extends Omit<PagePlan, "cards"> {
  cards: Array<
    PagePlan["cards"][number] & { runs: TextRun[]; covers: CoverRun[] }
  >;
}
export type ExportFormat = "pdf" | "images" | "both";
export interface ExportRequest {
  project: Project;
  images: ImageInfos;
  format: ExportFormat;
  dpi: 150 | 300;
}
export interface ExportProgress {
  stage: "preparing" | "pages" | "packing";
  done: number;
  total: number;
}
export interface ExportResult {
  bytes: Uint8Array<ArrayBuffer>;
  name: string;
  mime: string;
}
export interface ExportPort {
  start(
    request: ExportRequest,
    progress: (progress: ExportProgress) => void,
  ): Promise<ExportResult>;
  cancel(): void;
}
export interface AssetDescriptor {
  face: Face;
  width: number;
  height: number;
  mime: "image/png" | "image/jpeg";
}
