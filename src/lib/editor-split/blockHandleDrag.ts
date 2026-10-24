import { GOOSE_TEXT_MIME } from "@/lib/workspace-drag";

export const GOOSE_BLOCK_DRAG_MIME = "application/x-goose-block-drag";

const BLOCK_GRIP = ".bn-side-menu [draggable='true']";

let active = false;
let installed = false;

export function dragStartedFromBlockGrip(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  return Boolean((target as Element).closest(BLOCK_GRIP));
}

export function endBlockHandleDrag(): void {
  active = false;
}

function installBlockHandleDragWatch(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("dragstart", (event) => {
    active = dragStartedFromBlockGrip(event.target);
  }, true);
  window.addEventListener("dragend", endBlockHandleDrag, true);
}

export function beginBlockHandleDrag(): void {
  installBlockHandleDragWatch();
  active = true;
}

export function isBlockHandleDrag(): boolean {
  return active;
}

export function markBlockHandleDrag(data: DataTransfer): void {
  data.setData(GOOSE_BLOCK_DRAG_MIME, "1");
}

export function isInEditorMoveDrag(types: readonly string[]): boolean {
  return active
    || types.includes("blocknote/html")
    || types.includes(GOOSE_TEXT_MIME)
    || types.includes(GOOSE_BLOCK_DRAG_MIME);
}

installBlockHandleDragWatch();
