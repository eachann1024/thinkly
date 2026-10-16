import { createExtension } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { GooseBlockSelection, currentBlockNode, selectedBlockRoots, isBlockNodeSelection } from "./blockSelectionModel";
import { deleteSelectionSafely } from "./selectionDelete";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";

export const gooseBlockSelectionExtension = createExtension(({ editor }) => ({
  key: "goose-block-selection",
  prosemirrorPlugins: [new Plugin({
    key: new PluginKey("goose-block-selection"),
    props: {
      decorations(state) {
        if (!(state.selection instanceof GooseBlockSelection)) return null;
        return DecorationSet.create(state.doc, selectedBlockRoots(state).map(({ node, pos }) =>
          Decoration.node(pos, pos + node.nodeSize, { class: "ProseMirror-selectednode", "data-goose-block-selected": "true" }),
        ));
      },
      handleKeyDown(view, event) {
        if (view.composing || event.isComposing || event.keyCode === 229) return false;
        const primary = isPlatformPrimaryModifierEvent(event);
        if (primary || event.altKey || event.ctrlKey || event.metaKey) return false;
        if (editor.getExtension(SuggestionMenu)?.shown()) return false;
        const state = view.state;
        const block = currentBlockNode(state);
        if (!block) return false;
        if (event.key === "Escape") {
          view.dispatch(state.tr.setSelection(GooseBlockSelection.create(state.doc, block.pos)).scrollIntoView());
          return true;
        }
        if (!isBlockNodeSelection(state)) return false;
        if (event.key === "Backspace" || event.key === "Delete") {
          return editor.isEditable && deleteSelectionSafely(view);
        }
        if (event.key === "Enter") {
          const content = block.node.firstChild;
          if (content?.isTextblock) {
            view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, block.pos + 2)).scrollIntoView());
          }
          return true;
        }
        const direction = ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 :
          ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : 0;
        if (direction) {
          const candidates: { pos: number; size: number }[] = [];
          state.doc.descendants((node, pos) => {
            if (node.type.name === "blockContainer") candidates.push({ pos, size: node.nodeSize });
          });
          const target = direction > 0
            ? candidates.find((item) => item.pos >= block.pos + block.node.nodeSize)
            : candidates.filter((item) => item.pos < block.pos && item.pos + item.size <= block.pos).pop();
          if (!target) return true;
          const anchor = event.shiftKey && state.selection instanceof GooseBlockSelection
            ? state.selection.anchorBlockPos : block.pos;
          view.dispatch(state.tr.setSelection(GooseBlockSelection.create(
            state.doc, event.shiftKey ? anchor : target.pos, target.pos,
          )).scrollIntoView());
          return true;
        }
        // 块选择时按字符不会把整块替换；按 Enter 返回文字编辑。
        return event.key.length === 1;
      },
      handleTextInput(view) {
        return isBlockNodeSelection(view.state);
      },
    },
  })],
}));
