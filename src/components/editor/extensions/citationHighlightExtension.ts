import { createExtension } from "@blocknote/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";

// A view-only decoration: ProseMirror redraws nodes whose DOM classes change outside
// its control, so a raw class would vanish. Meta-only transactions never touch the doc.
export const CITATION_TARGET_CLASS = "goose-note-citation-target";
const key = new PluginKey<DecorationSet>("goose-note-citation-highlight");

type Meta = { from: number; to: number } | null;

const plugin = new Plugin<DecorationSet>({
  key,
  state: {
    init: () => DecorationSet.empty,
    apply(tr, set) {
      const meta = tr.getMeta(key) as Meta | undefined;
      if (meta === null) return DecorationSet.empty;
      if (meta) return DecorationSet.create(tr.doc, [Decoration.node(meta.from, meta.to, { class: CITATION_TARGET_CLASS })]);
      return tr.docChanged ? set.map(tr.mapping, tr.doc) : set;
    },
  },
  props: { decorations: (state) => key.getState(state) },
});

export const gooseCitationHighlightExtension = createExtension({
  key: "goose-note-citation-highlight",
  prosemirrorPlugins: [plugin],
});

/** Highlights the block content that contains `element`. Returns false when it is not in the doc. */
export function highlightCitationBlock(view: EditorView, element: HTMLElement): boolean {
  let pos: number;
  try { pos = view.posAtDOM(element, 0); } catch { return false; }
  const $pos = view.state.doc.resolve(Math.min(pos, view.state.doc.content.size));
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (node.type.name !== "blockContainer" || !node.firstChild) continue;
    const from = $pos.before(depth) + 1;
    view.dispatch(view.state.tr.setMeta(key, { from, to: from + node.firstChild.nodeSize }).setMeta("addToHistory", false));
    return true;
  }
  return false;
}

export function clearCitationHighlight(view: EditorView): void {
  if (!key.getState(view.state)?.find().length) return;
  view.dispatch(view.state.tr.setMeta(key, null).setMeta("addToHistory", false));
}
