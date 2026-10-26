import { useEffect } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import { setBlockHandleUi, type BlockHandleUiEditor, type BlockHandleUiPhase } from "../extensions/blockHandleUiExtension";

export const BLOCK_HANDLE_TOOLBAR_DELAY = 200;
export type BlockHandleHoverPhase = BlockHandleUiPhase;
type HoverView = BlockHandleUiEditor["prosemirrorView"] & { dom: HTMLElement };
type HoverEditor = { prosemirrorView: HoverView };

function publishForView(view: HoverView, dom: HTMLElement, blockId: string | undefined, phase: BlockHandleHoverPhase, locked = false) {
  if (view.isDestroyed) return;
  setBlockHandleUi({ prosemirrorView: view }, { blockId, phase, locked });
  if (view.isDestroyed) return;
  dom.dispatchEvent(new CustomEvent("goose:block-hover", { detail: { blockId, phase, locked } }));
}

export function publishBlockHandlePhase(editor: HoverEditor, blockId: string | undefined, phase: BlockHandleHoverPhase, locked = false) {
  const view = editor.prosemirrorView;
  publishForView(view, view.dom, blockId, phase, locked);
}

export function startBlockHandleUiLifecycle(editor: HoverEditor): () => void {
  const view = editor.prosemirrorView;
  const capturedEditor = { prosemirrorView: view };
  setBlockHandleUi(capturedEditor, { enabled: true });
  return () => setBlockHandleUi(capturedEditor, { enabled: false, blockId: undefined, phase: "none", locked: false, emptyBlockId: undefined });
}

export function startBlockHandleHoverPhase(editor: HoverEditor, blockId: string | undefined, locked: boolean, dragging: boolean): () => void {
  if (!blockId) return () => {};
  const view = editor.prosemirrorView;
  const dom = view.dom;
  const publish = (nextBlockId: string | undefined, phase: BlockHandleHoverPhase, nextLocked = false) =>
    publishForView(view, dom, nextBlockId, phase, nextLocked);
  publish(blockId, dragging ? "none" : "handle", locked || dragging);
  const timer = !locked && !dragging ? window.setTimeout(() => {
    publish(blockId, "toolbar");
  }, BLOCK_HANDLE_TOOLBAR_DELAY) : undefined;
  return () => {
    window.clearTimeout(timer);
    publish(undefined, "none");
  };
}

export function useBlockHandleHoverPhase(editor: BlockNoteEditor<any, any, any>, blockId: string | undefined, locked: boolean, dragging: boolean) {
  useEffect(() => {
    return startBlockHandleUiLifecycle(editor as HoverEditor);
  }, [editor]);
  useEffect(() => startBlockHandleHoverPhase(editor as HoverEditor, blockId, locked, dragging), [editor, blockId, locked, dragging]);
}
