import type { TicketElement } from "../domain/model";
export const canDuplicate = (
  element: TicketElement,
  elements: TicketElement[],
) =>
  elements.filter((e) => e.kind === element.kind).length <
  (element.kind === "cover" ? 8 : 4);
export const canRemove = (
  element: TicketElement,
  elements: TicketElement[],
  numbered: boolean,
) =>
  !(
    element.kind === "sequence" &&
    numbered &&
    elements.filter((e) => e.kind === "sequence").length === 1
  );
