import { createExtension } from "@blocknote/core";
import { Plugin, type EditorState } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";

const SPECIAL_TYPES = new Set(["codeBlock", "callout", "quote"]);

function specialBlockTypes(doc: PMNode): Map<string, string> {
  const ids = new Map<string, string>();
  doc.descendants((node) => {
    if (node.type.name === "blockContainer" && SPECIAL_TYPES.has(node.firstChild?.type.name ?? "")) {
      ids.set(node.attrs.id, node.firstChild!.type.name);
    }
  });
  return ids;
}

function isSpecialSelection(state: EditorState): boolean {
  return SPECIAL_TYPES.has(state.selection.$from.parent.type.name);
}

export const gooseSuppressMarkdownInSpecialBlocksExtension = createExtension({
  key: "goose-suppress-markdown-in-special-blocks",
  prosemirrorPlugins: [new Plugin({
    filterTransaction(tr, state) {
      if (!tr.docChanged || !state.plugins.some((plugin) => (
        plugin.spec.isInputRules && tr.getMeta(plugin)
      ))) return true;
      const special = specialBlockTypes(state.doc);
      let allowed = true;
      tr.doc.descendants((node) => {
        if (node.type.name === "blockContainer" && special.has(node.attrs.id)) {
          if (special.get(node.attrs.id) !== node.firstChild?.type.name) allowed = false;
        }
      });
      return allowed;
    },
    props: {
      handleTextInput(view, from, to, text) {
        if (view.composing || !isSpecialSelection(view.state)) return false;
        view.dispatch(view.state.tr.insertText(text, from, to));
        return true;
      },
    },
  })],
});
