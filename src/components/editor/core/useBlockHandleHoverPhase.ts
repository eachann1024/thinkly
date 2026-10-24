import { useEffect } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import { setBlockHandleUi, type BlockHandleUiEditor, type BlockHandleUiPhase } from "../extensions/blockHandleUiExtension";

export const BLOCK_HANDLE_TOOLBAR_DELAY = 200;
export type BlockHandleHoverPhase = BlockHandleUiPhase;
type HoverEditor = BlockHandleUiEditor & { prosemirrorView: { dom: HTMLElement } };

export function publishBlockHandlePhase(editor: HoverEditor, blockId: string | undefined, phase: BlockHandleHoverPhase, locked = false) {
  setBlockHandleUi(editor, { blockId, phase, locked });
  editor.prosemirrorView.dom.dispatchEvent(new CustomEvent("goose:block-hover", { detail: { blockId, phase, locked } }));
}

export function startBlockHandleHoverPhase(editor: HoverEditor, blockId: string | undefined, locked: boolean, dragging: boolean): () => void {
  if (!blockId) return () => {};
  publishBlockHandlePhase(editor, blockId, dragging ? "none" : "handle", locked || dragging);
  const timer = !locked && !dragging ? window.setTimeout(() => {
    publishBlockHandlePhase(editor, blockId, "toolbar");
  }, BLOCK_HANDLE_TOOLBAR_DELAY) : undefined;
  return () => {
    window.clearTimeout(timer);
    publishBlockHandlePhase(editor, undefined, "none");
  };
}

export function useBlockHandleHoverPhase(editor: BlockNoteEditor<any, any, any>, blockId: string | undefined, locked: boolean, dragging: boolean) {
  useEffect(() => {
    setBlockHandleUi(editor, { enabled: true });
    return () => { setBlockHandleUi(editor, { enabled: false, blockId: undefined, phase: "none", locked: false, emptyBlockId: undefined }); };
  }, [editor]);
  useEffect(() => startBlockHandleHoverPhase(editor, blockId, locked, dragging), [editor, blockId, locked, dragging]);
}
