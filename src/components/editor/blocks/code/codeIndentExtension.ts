import { isWorkspaceSettingsOpen } from "@/lib/settings-navigation";
import { createExtension } from "@blocknote/core";
import { closeHistory } from "@tiptap/pm/history";
import { Plugin } from "prosemirror-state";
import { indentCodeSelection } from "./codeBlockIndent";
import {
  getCodeBlockSelection,
  getCodeBlockText,
  insertCodeBlockText,
  replaceCodeBlockText,
} from "./codeBlockTransactions";

export const codeBlockTabIndentExtension = createExtension({
  key: "goose-code-block-tab-indent",
  runsBefore: ["goose-tab-behavior"],
  prosemirrorPlugins: [
    new Plugin({
      props: {
        handleKeyDown(view, event) {
          if (
            event.key !== "Tab" ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.isComposing ||
            event.keyCode === 229 ||
            view.composing ||
            !view.editable ||
            isWorkspaceSettingsOpen()
          ) {
            return false;
          }
          const code = getCodeBlockSelection(view.state.selection);
          if (!code) return false;
          const currentText = getCodeBlockText(code.node);
          const next = indentCodeSelection(
            currentText,
            code.anchor,
            code.head,
            { outdent: event.shiftKey },
          );
          if (
            next.text === currentText &&
            code.node.textContent === currentText &&
            next.selectionStart === code.anchor &&
            next.selectionEnd === code.head
          )
            return true;
          const tr = closeHistory(view.state.tr);
          replaceCodeBlockText(
            tr,
            next.text,
            next.selectionStart,
            next.selectionEnd,
          );
          view.dispatch(tr.scrollIntoView());
          return true;
        },
        handlePaste(view, event) {
          if (!view.editable || view.composing || isWorkspaceSettingsOpen())
            return false;
          if (!getCodeBlockSelection(view.state.selection)) return false;
          const text = event.clipboardData?.getData("text/plain");
          if (text == null || text === "") return false;
          const tr = closeHistory(view.state.tr);
          insertCodeBlockText(tr, text.replace(/\r\n?/g, "\n"));
          view.dispatch(
            tr
              .setMeta("paste", true)
              .setMeta("uiEvent", "paste")
              .scrollIntoView(),
          );
          return true;
        },
      },
    }),
  ],
});
