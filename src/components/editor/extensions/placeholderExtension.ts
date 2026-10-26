import { createExtension } from "@blocknote/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { getLocale } from "@/i18n";
import { kbdRecipes } from "@/components/ui/kbd";
import { getEditorPlaceholders, type EditorPlaceholderProfile } from "../core/editorLocale";

export const goosePlaceholderKey = new PluginKey<EditorPlaceholderProfile>("goose-placeholder");
const defaultBlockTypes = new Set([
  "paragraph", "heading", "bulletListItem", "numberedListItem", "checkListItem",
]);

function createPlaceholder(document: Document, text: string) {
  const hint = document.createElement("span");
  hint.className = "goose-editor-placeholder";
  hint.contentEditable = "false";
  hint.setAttribute("aria-hidden", "true");
  const match = /[/／]/.exec(text);
  if (!match) {
    hint.textContent = text;
    return hint;
  }
  const key = document.createElement("kbd");
  key.className = kbdRecipes.inline;
  key.dataset.gooseControl = "kbd";
  key.dataset.gooseContext = "editor";
  key.textContent = "/";
  hint.append(text.slice(0, match.index), key, text.slice(match.index + 1));
  return hint;
}

// A view decoration keeps the hint out of note content, undo and clipboard data.
export const goosePlaceholderExtension = createExtension(({ editor }) => ({
  key: "goose-placeholder",
  prosemirrorPlugins: [new Plugin<EditorPlaceholderProfile>({
    key: goosePlaceholderKey,
    state: {
      init: () => "history",
      apply: (transaction, profile) => transaction.getMeta(goosePlaceholderKey) ?? profile,
    },
    props: {
      decorations(state) {
        if (goosePlaceholderKey.getState(state) !== "note" || !editor.isEditable) return null;
        const { selection } = state;
        const { $anchor } = selection;
        const node = $anchor.parent;
        if (!selection.empty || node.content.size || !defaultBlockTypes.has(node.type.name)) return null;
        const text = getEditorPlaceholders("note").default ?? "";
        const from = $anchor.before();
        return DecorationSet.create(state.doc, [
          Decoration.node(from, from + node.nodeSize, { class: "goose-placeholder-host" }),
          Decoration.widget($anchor.pos, (view) => createPlaceholder(view.dom.ownerDocument, text), {
            key: `goose-placeholder-${getLocale()}`,
            side: -1,
            ignoreSelection: true,
          }),
        ]);
      },
    },
  })],
}));
