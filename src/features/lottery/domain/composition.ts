import {
  LIMITS,
  PAPERS,
  type Face,
  type ImageInfo,
  type ImageInfos,
  type Layout,
  type PagePlan,
  type Project,
  type Rect,
} from "./model";

export function validateSequence(sequence: Project["sequence"]) {
  const { start, end, pad, prefix, suffix } = sequence;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end > 999999999 ||
    end < start
  )
    throw new Error(
      "El rango debe contener enteros entre 0 y 999999999, con fin mayor o igual al inicio.",
    );
  if (end - start + 1 > LIMITS.tickets)
    throw new Error(
      `Máximo ${LIMITS.tickets} tarjetas por trabajo. Reduce el rango.`,
    );
  if (
    !Number.isInteger(pad) ||
    pad < 1 ||
    pad > 9 ||
    prefix.length > 20 ||
    suffix.length > 20
  )
    throw new Error(
      "Revisa el relleno (1–9) y el prefijo/sufijo (máximo 20 caracteres).",
    );
}
export function formatNumber(number: number, sequence: Project["sequence"]) {
  return (
    sequence.prefix +
    String(number).padStart(sequence.pad, "0") +
    sequence.suffix
  );
}
export function faceIsNumbered(project: Project, face: Face) {
  return project.mode === "single"
    ? face === "front"
    : project.numbered === "both" || project.numbered === face;
}
export function fitImage(info: ImageInfo, rect: Rect): Rect {
  const scale = Math.min(rect.width / info.width, rect.height / info.height);
  const width = info.width * scale,
    height = info.height * scale;
  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  };
}
export function calculateLayout(project: Project, images: ImageInfos): Layout {
  validateSequence(project.sequence);
  if (!images.front)
    throw new Error("Selecciona la imagen del frente para comenzar.");
  if (project.mode === "duplex" && !images.back)
    throw new Error("Selecciona también la imagen del reverso.");
  const l = project.layout;
  const paper = l.paper === "custom" ? l : PAPERS[l.paper];
  const short = Math.min(paper.width, paper.height),
    long = Math.max(paper.width, paper.height);
  const width = l.orientation === "portrait" ? short : long;
  const height = l.orientation === "portrait" ? long : short;
  if (
    ![width, height].every(
      (n) => Number.isFinite(n) && n >= LIMITS.paperMin && n <= LIMITS.paperMax,
    )
  )
    throw new Error("El papel debe medir entre 50 y 600 mm por lado.");
  if (
    ![l.rows, l.columns].every((n) => Number.isInteger(n) && n >= 1 && n <= 10)
  )
    throw new Error("Filas y columnas deben ser enteros de 1 a 10.");
  if (![l.margin, l.gapX, l.gapY].every((n) => Number.isFinite(n) && n >= 0))
    throw new Error("Márgenes y separaciones no pueden ser negativos.");
  const availableW = width - l.margin * 2 - (l.columns - 1) * l.gapX;
  const availableH = height - l.margin * 2 - (l.rows - 1) * l.gapY;
  const ratio = images.front.width / images.front.height;
  const cardWidth =
    l.sizing === "manual"
      ? l.cardWidth
      : Math.min(availableW / l.columns, (availableH / l.rows) * ratio);
  const cardHeight = cardWidth / ratio;
  if (
    !Number.isFinite(cardWidth) ||
    cardWidth < 5 ||
    cardWidth * l.columns > availableW + 0.00001 ||
    cardHeight * l.rows > availableH + 0.00001
  )
    throw new Error(
      "Las tarjetas no caben. Reduce el tamaño, las filas/columnas, los márgenes o las separaciones.",
    );
  const count = project.sequence.end - project.sequence.start + 1;
  const perSheet = l.rows * l.columns,
    sheets = Math.ceil(count / perSheet);
  const pages = sheets * (project.mode === "duplex" ? 2 : 1);
  if (pages > LIMITS.pages)
    throw new Error(
      `Máximo ${LIMITS.pages} páginas. Reduce el rango o coloca más tarjetas por hoja.`,
    );
  return {
    width,
    height,
    cardWidth,
    cardHeight,
    left: (width - l.columns * cardWidth - (l.columns - 1) * l.gapX) / 2,
    top: (height - l.rows * cardHeight - (l.rows - 1) * l.gapY) / 2,
    count,
    perSheet,
    sheets,
    pages,
  };
}
export function planPage(
  project: Project,
  images: ImageInfos,
  layout: Layout,
  index: number,
): PagePlan {
  if (!Number.isInteger(index) || index < 0 || index >= layout.pages)
    throw new Error("Página fuera del rango.");
  const duplex = project.mode === "duplex";
  const face: Face = duplex && index % 2 ? "back" : "front";
  const sheet = duplex ? Math.floor(index / 2) : index;
  const info = images[face];
  if (!info) throw new Error("Falta la imagen de esta cara.");
  const cards: PagePlan["cards"] = [];
  for (let slot = 0; slot < layout.perSheet; slot++) {
    const number = project.sequence.start + sheet * layout.perSheet + slot;
    if (number > project.sequence.end) break;
    let row = Math.floor(slot / project.layout.columns),
      col = slot % project.layout.columns;
    if (face === "back") {
      const reflectColumns =
        layout.height >= layout.width === (project.layout.flip === "long");
      if (reflectColumns) col = project.layout.columns - 1 - col;
      else row = project.layout.rows - 1 - row;
    }
    const rect = {
      x: layout.left + col * (layout.cardWidth + project.layout.gapX),
      y: layout.top + row * (layout.cardHeight + project.layout.gapY),
      width: layout.cardWidth,
      height: layout.cardHeight,
    };
    const label = formatNumber(number, project.sequence);
    const elements = project.elements[face]
      .filter((e) => e.kind !== "sequence" || faceIsNumbered(project, face))
      .map((e) => ({
        ...e,
        value: e.kind === "sequence" ? label : e.kind === "text" ? e.text : "",
      }));
    cards.push({
      ...rect,
      number,
      label,
      image: fitImage(info, rect),
      elements,
    });
  }
  return { index, face, width: layout.width, height: layout.height, cards };
}
export function effectiveDpi(info: ImageInfo, layout: Layout) {
  const rect = fitImage(info, {
    x: 0,
    y: 0,
    width: layout.cardWidth,
    height: layout.cardHeight,
  });
  return Math.min(info.width / rect.width, info.height / rect.height) * 25.4;
}
