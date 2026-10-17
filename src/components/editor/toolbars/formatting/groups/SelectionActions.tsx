import { useRef, useState } from "react";
import { useBlockNoteEditor } from "@blocknote/react";
import { FormattingToolbarExtension } from "@blocknote/core/extensions";
import { TextSelection } from "prosemirror-state";
import { toast } from "@/components/ui/sonner";
import { Copy, X } from "@/components/ui/icons";
import { Button } from "@/components/editor/ui/button";
import { Tooltip, TooltipTrigger } from "@/components/editor/ui/tooltip";
import { getEditorSelectionPlainText } from "@/components/editor/utils/clipboard";
import { getSelectedCellPlainText } from "@/components/editor/utils/selection";
import { setFakeSelection } from "@/components/editor/extensions/fakeSelectionExtension";
import {
  restoreSelectionAfterFormat,
  snapshotCurrentSelection,
} from "../selectionRestore";
import { ToolbarTooltip, type BindTooltip } from "../ToolbarTooltip";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/toolbars/formatting/groups/SelectionActions.tsx#messages:1">`
zh-Hans:
  couldNotCopyPleaseTryAgain: "复制失败，请重试"
  copying: "复制中"
  copySelection: "复制选中内容"
  clearSelection: "取消选区"
en:
  couldNotCopyPleaseTryAgain: "Could not copy. Please try again."
  copying: "Copying"
  copySelection: "Copy selection"
  clearSelection: "Clear selection"
`;
const t = createTranslator(messages);


export function SelectionActions({
  bindTooltip,
}: {
  bindTooltip: BindTooltip;
}) {
  useLocale();
  const editor = useBlockNoteEditor();
  const [copying, setCopying] = useState(false);
  const pending = useRef(false);
  const copy = async () => {
    if (pending.current) return;
    pending.current = true;
    setCopying(true);
    try {
      const snapshot = snapshotCurrentSelection(editor);
      const text =
        getSelectedCellPlainText(editor.prosemirrorState) ??
        getEditorSelectionPlainText(editor.prosemirrorState);
      let copied = false;
      try {
        editor.focus();
        restoreSelectionAfterFormat(editor, snapshot);
        copied = document.execCommand("copy");
      } catch {
        // Native copy may be unavailable; use the same plain-text serializer.
      } finally {
        restoreSelectionAfterFormat(editor, snapshot);
      }
      if (!copied) {
        if (!navigator.clipboard?.writeText)
          throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(text);
      }
    } catch {
      toast.error(t("couldNotCopyPleaseTryAgain"));
    } finally {
      pending.current = false;
      setCopying(false);
    }
  };
  const cancel = () => {
    const view = editor.prosemirrorView;
    const { state } = view;
    view.dispatch(
      state.tr
        .setSelection(TextSelection.near(state.selection.$from))
        .setMeta("addToHistory", false),
    );
    setFakeSelection(editor, null);
    editor.getExtension(FormattingToolbarExtension)?.store.setState(false);
    editor.focus();
  };
  return (
    <>
      <Tooltip {...bindTooltip("copy-selection")}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="goose-formatting-toolbar-control"
            aria-label={copying ? t("copying") : t("copySelection")}
            aria-busy={copying}
            disabled={copying}
            onClick={() => void copy()}
          >
            <Copy />
          </Button>
        </TooltipTrigger>
        <ToolbarTooltip
          label={copying ? t("copying") : t("copySelection")}
          shortcut="Mod+C"
        />
      </Tooltip>
      <Tooltip {...bindTooltip("cancel-selection")}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="goose-formatting-toolbar-control"
            aria-label={t("clearSelection")}
            onClick={cancel}
          >
            <X />
          </Button>
        </TooltipTrigger>
        <ToolbarTooltip label={t("clearSelection")} shortcut="Esc" />
      </Tooltip>
    </>
  );
}
