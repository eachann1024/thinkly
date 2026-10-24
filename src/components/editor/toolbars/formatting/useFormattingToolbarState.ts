import {
  useBlockNoteEditor,
  useEditorState,
  useExtension,
} from "@blocknote/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GooseAIExtension } from "@/components/editor/ai/GooseAIExtension";
import {
  useEditorPageContext,
  useEditorSettings,
} from "@/components/editor/platform/hostContext";
import { useBlockHandleMenuOpen } from "../../state/blockHandleMenu";
import { useContextMenu } from "@/components/editor/state/contextMenu";
import { useGlobalScrollActivity } from "@/components/editor/hooks/useGlobalScrollActivity";
import { useFormattingToolbarAi } from "@/components/editor/state/formattingToolbarAi";
import { useFormattingToolbarHold } from "@/components/editor/state/formattingToolbarHold";
import {
  applySelectionTextAlignment,
  clearSelectionFormatting,
  getFormattingToolbarCapabilities,
  selectionDisallowsFormattingToolbar,
  selectionIsInsideFirstTitleBlock,
  shouldRenderFormattingToolbar,
  useSelectionMarkStates,
} from "./helpers";
import type { BindTooltip } from "./ToolbarTooltip";
import { getListTypeToolbarState } from "./listType";
import { getSelectedImageUrl } from "@/components/editor/utils/selection";
import { isQuickNoteEditorPage } from "@/pages/workspace/components/editor-host/editorContentMode";
import { useFormattingToolbarAiActivate } from "./useFormattingToolbarAiActivate";

export function useFormattingToolbarState() {
  const editor = useBlockNoteEditor();
  const blockHandleMenuOpen = useBlockHandleMenuOpen(editor);

  const aiExtension = __GOOSE_EDITOR_AI__
    ? useExtension(GooseAIExtension)
    : undefined;
  const { ai: aiSettings } = useEditorSettings();
  const { contentMode, page } = useEditorPageContext();
  const protectsFirstTitle = contentMode === "normalized";
  const isQuickNoteSurface =
    __GOOSE_EDITOR_COMPACT__ || isQuickNoteEditorPage(page);
  const markStates = useSelectionMarkStates(editor);

  const selectionState = useEditorState({
    editor,
    selector: ({ editor }) => {
      const { selection, doc } = editor.prosemirrorState;

      const selectedText = doc
        .textBetween(selection.from, selection.to, "\n", "\n")
        .trim();
      let quoteText: string;
      try {
        quoteText = (editor.getSelectedText() ?? "").trim();
      } catch {
        quoteText = selectedText;
      }

      return {
        hasTextSelection:
          (!selection.empty && selectedText.length > 0) ||
          shouldRenderFormattingToolbar(editor),
        disallowsFormattingToolbar: selectionDisallowsFormattingToolbar(editor),
        selectedQuoteText: quoteText,
        isImageNodeSelection:
          getSelectedImageUrl(editor.prosemirrorState) != null,
      };
    },
  });

  const isInTitleOne = useEditorState({
    editor,
    selector: ({ editor }) =>
      protectsFirstTitle && selectionIsInsideFirstTitleBlock(editor),
  });

  const caps = useEditorState({
    editor,
    selector: ({ editor }) => getFormattingToolbarCapabilities(editor),
  });

  const holdDuringPointerSelect = useFormattingToolbarHold();
  const aiActive = useFormattingToolbarAi(
    (s) => s.active && s.owner === editor,
  );
  const activateFormattingToolbarAi = useFormattingToolbarAi(
    (state) => state.activate,
  );
  const resetFormattingToolbarAi = useFormattingToolbarAi(
    (state) => state.reset,
  );

  const openMenuId = useContextMenu((state) => state.openMenuId);
  const isContextMenuOpen = Boolean(openMenuId);
  const scrollActivity = useGlobalScrollActivity({ idleMs: 120 });
  const isScrolling = scrollActivity.isScrolling;

  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [selectionMenus, setSelectionMenus] = useState<string[]>([]);
  const handleSelectionMenuOpen = useCallback((id: string, open: boolean) => {
    setSelectionMenus((previous) => {
      if (previous.includes(id) === open) return previous;
      return open ? [...previous, id] : previous.filter((item) => item !== id);
    });
  }, []);
  const selectionMenuOpen = selectionMenus.length > 0;
  const menuRef = useRef<HTMLDivElement | null>(null);

  const bindTooltip = useCallback<BindTooltip>(
    (id) => ({
      delayDuration: 400,
      open: activeTooltip === id,
      onOpenChange: (open) =>
        setActiveTooltip((prev) => (open ? id : prev === id ? null : prev)),
    }),
    [activeTooltip],
  );

  useEffect(() => {
    if (!isScrolling && !isContextMenuOpen) return;
    setActiveTooltip(null);
  }, [isScrolling, isContextMenuOpen]);

  const handleAiActivate = useFormattingToolbarAiActivate({
    editor,
    aiSettings,
    aiExtension,
    activateFormattingToolbarAi,
    resetFormattingToolbarAi,
    setActiveTooltip,
  });

  const isBold = markStates.bold;
  const isItalic = markStates.italic;
  const isStrike = markStates.strike;
  const isUnderline = markStates.underline;
  const isCode = markStates.code;

  const textAlignment = caps.textAlignment;
  const listState = useEditorState({
    editor,
    selector: ({ editor }) => getListTypeToolbarState(editor),
  });

  const linkUrl = caps.showLink ? editor.getSelectedLinkUrl() : undefined;
  const isLinkActive = !!linkUrl;

  const setTextAlignment = useCallback(
    (alignment: "left" | "center" | "right") => {
      applySelectionTextAlignment(editor, alignment);
    },
    [editor],
  );

  const clearFormatting = useCallback(() => {
    clearSelectionFormatting(editor);
  }, [editor]);

  const shouldHideForScroll =
    (!isQuickNoteSurface && isScrolling) || isContextMenuOpen;
  const shouldHide =
    !aiActive && !colorPickerOpen && !selectionMenuOpen && shouldHideForScroll;

  const visible =
    !blockHandleMenuOpen &&
    editor.isEditable &&
    (aiActive ||
      colorPickerOpen ||
      selectionMenuOpen ||
      holdDuringPointerSelect ||
      (selectionState.hasTextSelection &&
        !selectionState.disallowsFormattingToolbar &&
        !isInTitleOne));

  return {
    visible,
    editor,
    aiSettings,
    page,
    isQuickNoteSurface,
    selectionState,
    caps,
    aiActive,
    bindTooltip,
    menuRef,
    handleAiActivate,
    isBold,
    isItalic,
    isStrike,
    isUnderline,
    isCode,
    textAlignment,
    listState,
    linkUrl,
    isLinkActive,
    setTextAlignment,
    clearFormatting,
    shouldHide,
    setColorPickerOpen,
    handleSelectionMenuOpen,
    childSelectionMenuOpen:
      colorPickerOpen || selectionMenus.some((id) => id !== "more"),
  };
}
