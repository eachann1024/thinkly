import { createExtension } from "@blocknote/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import type { Node } from "@tiptap/pm/model";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

export type BlockHandleUiPhase = "handle" | "toolbar" | "none";
export type BlockHandleUiState = {
  enabled: boolean;
  blockId?: string;
  phase: BlockHandleUiPhase;
  locked: boolean;
  emptyBlockId?: string;
};
export type BlockHandleUiEditor = { prosemirrorView: Pick<EditorView, "state" | "dispatch"> & { isDestroyed?: boolean } };
const initial: BlockHandleUiState = { enabled: false, phase: "none", locked: false };
export const blockHandleUiKey = new PluginKey<BlockHandleUiState>("goose-block-handle-ui");
const decorationCache = new WeakMap<Node, WeakMap<BlockHandleUiState, DecorationSet>>();

function equals(a: BlockHandleUiState, b: BlockHandleUiState) {
  return a.enabled === b.enabled && a.blockId === b.blockId && a.phase === b.phase &&
    a.locked === b.locked && a.emptyBlockId === b.emptyBlockId;
}

export function setBlockHandleUi(editor: BlockHandleUiEditor, patch: Partial<BlockHandleUiState>) {
  const view = editor.prosemirrorView;
  if (view.isDestroyed) return;
  const current = blockHandleUiKey.getState(view.state);
  if (!current || equals(current, { ...current, ...patch })) return;
  view.dispatch(view.state.tr.setMeta(blockHandleUiKey, patch).setMeta("addToHistory", false));
}

export function resolveBlockHandleUiDecorations(state: EditorState): DecorationSet {
  const ui = blockHandleUiKey.getState(state) ?? initial;
  if (!ui.enabled || (!ui.blockId && !ui.emptyBlockId)) return DecorationSet.empty;
  let cachedStates = decorationCache.get(state.doc);
  if (!cachedStates) { cachedStates = new WeakMap(); decorationCache.set(state.doc, cachedStates); }
  const cached = cachedStates.get(ui);
  if (cached) return cached;
  const decorations: Decoration[] = [];
  state.doc.descendants((node, pos) => {
    if (node.type.name !== "blockContainer") return;
    const attrs: Record<string, string> = {};
    if (node.attrs.id === ui.blockId) {
      if (ui.phase !== "none") attrs["data-goose-block-hover"] = ui.phase;
      if (ui.locked) attrs["data-goose-block-tools-suppressed"] = "true";
    }
    if (node.attrs.id === ui.emptyBlockId) attrs["data-goose-empty-handle-hover"] = "true";
    if (Object.keys(attrs).length) decorations.push(Decoration.node(pos, pos + node.nodeSize, attrs));
  });
  const result = DecorationSet.create(state.doc, decorations);
  cachedStates.set(ui, result);
  return result;
}

export const blockHandleUiPlugin = new Plugin<BlockHandleUiState>({
  key: blockHandleUiKey,
  state: {
    init: () => initial,
    apply: (transaction, current) => {
      const patch = transaction.getMeta(blockHandleUiKey) as Partial<BlockHandleUiState> | undefined;
      if (!patch) return current;
      const next = { ...current, ...patch };
      return equals(current, next) ? current : next;
    },
  },
  props: {
    attributes: (state): Record<string, string> => blockHandleUiKey.getState(state)?.enabled ? { "data-goose-block-toolbar-sequence": "true" } : {},
    decorations: resolveBlockHandleUiDecorations,
  },
});

export const gooseBlockHandleUiExtension = createExtension({
  key: "goose-block-handle-ui",
  prosemirrorPlugins: [blockHandleUiPlugin],
});
