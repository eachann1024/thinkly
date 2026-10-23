import { GOOSE_TEXT_MIME } from "@/lib/workspace-drag";

/**
 * 块把手只在正文里搬块。
 * 大文档走轻量拖动时只放 text/plain，分屏会把它当成外部文本，在格子边缘新开一格。
 * dragover 有时读不到自定义 MIME，所以另用这次拖动的标记把落区让开。
 */
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

/** 块把手、BlockNote 内部拖动、正文选区：分屏内容落区应让开。 */
export function isInEditorMoveDrag(types: readonly string[]): boolean {
  return active
    || types.includes("blocknote/html")
    || types.includes(GOOSE_TEXT_MIME)
    || types.includes(GOOSE_BLOCK_DRAG_MIME);
}

installBlockHandleDragWatch();
