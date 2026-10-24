import { useEffect, useState } from "react";
import { blockHandleUiKey, type BlockHandleUiEditor } from "../extensions/blockHandleUiExtension";

export const BLOCK_HOVER_EVENT = "goose:block-hover";
export type BlockHoverPhase = "handle" | "toolbar" | "none";
export type BlockHoverDetail = {
  blockId?: string;
  phase: BlockHoverPhase;
  locked?: boolean;
};

type EditorRoot = BlockHandleUiEditor & { prosemirrorView: { dom: HTMLElement } };

export function getBlockToolbarState(editor: BlockHandleUiEditor, blockId?: string) {
  const ui = blockHandleUiKey.getState(editor.prosemirrorView.state);
  const active = Boolean(blockId && ui?.enabled && ui.blockId === blockId);
  return {
    ready: active && ui?.phase === "toolbar",
    suppressed: active && Boolean(ui?.locked),
  };
}

export function subscribeBlockHover(
  root: HTMLElement,
  listener: (detail: BlockHoverDetail) => void,
) {
  const handle = (event: Event) => {
    const detail = (event as CustomEvent<BlockHoverDetail>).detail;
    if (detail) listener(detail);
  };
  root.addEventListener(BLOCK_HOVER_EVENT, handle);
  return () => root.removeEventListener(BLOCK_HOVER_EVENT, handle);
}

/** Consume the side handle's single hover clock; never start another timer. */
export function useBlockToolbarState(editor: EditorRoot, blockId?: string) {
  const [state, setState] = useState({ blockId, ready: false, suppressed: false });
  useEffect(() => {
    const root = editor.prosemirrorView.dom;
    const update = () => {
      const next = { blockId, ...getBlockToolbarState(editor, blockId) };
      setState((current) => current.blockId === next.blockId &&
        current.ready === next.ready && current.suppressed === next.suppressed
        ? current : next);
    };
    update();
    return subscribeBlockHover(root, update);
  }, [editor, blockId]);
  return state.blockId === blockId ? state : { ready: false, suppressed: false };
}
