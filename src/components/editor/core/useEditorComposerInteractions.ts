import { useCallback, useEffect, useRef, useReducer } from "react";
import { useSettings } from "@/stores/useSettings";
import { editorOverlayReducer, initialEditorOverlays } from "./editorOverlayState";
import { isWorkspaceSettingsOpen } from "@/lib/settings-navigation";
import { GooseAIExtension } from "@/components/editor/ai/GooseAIExtension";
import {
  isLinkShortcutClaimedByApp,
  isPrimaryLinkShortcutEvent,
} from "@/components/editor/extensions/linkKeyboardExtension";
import { matchShortcut } from "@/lib/shortcut-match";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { getSelectedImageUrl } from "@/components/editor/utils/selection";
import {
  SELECTION_QUOTE_ADD_SHORTCUT,
  canDispatchAppendComposerSelection,
  dispatchAppendComposerSelection,
} from "@/components/editor/ai/composer/selectionQuote";
import {
  isInlineAiEmptyParagraphTriggerKey,
  shouldOpenInlineAiOnEmptyParagraph,
} from "@/components/editor/ai/emptyParagraphAiShortcut";
import { isQuickNoteEditorPage } from "@/pages/workspace/components/editor-host/editorContentMode";
import { usePageMentionItems } from "@/components/editor/inline/usePageMentionItems";
import {
  useEditorSettings,
} from "@/components/editor/platform/hostContext";
import type { EditorComposerProps } from "./editorComposerTypes";
import { useEditorOverlayEvents } from "./useEditorOverlayEvents";

export function useEditorComposerInteractions({
  editor,
  editable,
  isActiveEditor,
  page,
  editorContainerRef,
}: Pick<
  EditorComposerProps,
  "editor" | "editable" | "isActiveEditor" | "page" | "editorContainerRef"
>) {
  const [overlays, dispatch] = useReducer(editorOverlayReducer, initialEditorOverlays);
  const linkPopoverRef = useRef<HTMLDivElement | null>(null);
  const linkPopoverOpen = overlays.link.phase === "open";
  const linkPopoverUrl = overlays.link.phase === "open" ? overlays.link.url : "";
  const closeLinkPopover = useCallback(() => dispatch({ type: "link-closed" }), []);
  const editLinkPopover = (url: string) => dispatch({ type: "link-edited", url });
  const closeFindBar = () => dispatch({ type: "find-closed" });
  const { ai: aiSettings } = useEditorSettings();
  const getMentionItems = usePageMentionItems(editor);

  const handleEditorKeyDownCapture = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    const target = event.target as HTMLElement | null;
    const settings = useSettings.getState();
    const isPrimaryLinkShortcut =
      editable &&
      isPrimaryLinkShortcutEvent(event) &&
      !isLinkShortcutClaimedByApp([
        ...Object.values(settings.appShortcuts),
        settings.closeTabShortcut,
        settings.searchPanelCloseShortcut,
      ]) &&
      !!target?.closest(".bn-editor");

    if (isPrimaryLinkShortcut) {
      const url = editor.getSelectedLinkUrl();
      const selectedText = editor.getSelectedText();
      if (url || selectedText) {
        event.preventDefault();
        event.stopPropagation();
        if (url) {
          editor.deleteLink();
        } else {
          document.dispatchEvent(new CustomEvent("goose-open-link-popover"));
        }
        return;
      }
    }

    if (isQuickNoteEditorPage(page)) return;
    if (
      !__GOOSE_EDITOR_AI__ ||
      !isInlineAiEmptyParagraphTriggerKey(event.key)
    ) {
      return;
    }

    let block: any;
    let inTable = false;
    let selectionEmpty = true;
    try {
      const selection = editor.prosemirrorState?.selection;
      selectionEmpty = selection?.empty !== false;
      inTable = Boolean(
        selection?.$from?.parent?.type?.isInGroup?.("tableContent"),
      );
      block = editor.getTextCursorPosition().block;
    } catch {
      block = null;
    }

    if (
      !shouldOpenInlineAiOnEmptyParagraph({
        key: event.key,
        defaultPrevented: event.defaultPrevented,
        repeat: event.repeat,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        isComposing: event.nativeEvent.isComposing,
        editable,
        aiEnabled: aiSettings.enabled,
        inEditor: Boolean(target?.closest(".bn-editor")),
        inTable,
        selectionEmpty,
        block,
      })
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    const ai = editor.getExtension(GooseAIExtension);
    if (ai && block?.id) {
      ai.openAIMenuAtBlock(block.id);
    }
  };

  useEditorOverlayEvents({
    editor, editorContainerRef, isActiveEditor, pageId: page.id,
    dispatch,
  });

  useEffect(() => {
    if (!linkPopoverOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (linkPopoverRef.current?.contains(target)) return;
      closeLinkPopover();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (isWorkspaceSettingsOpen()) return;
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !event.isComposing &&
        !event.repeat
      ) {
        event.preventDefault();
        event.stopPropagation();
        closeLinkPopover();
      }
    };
    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleEscape, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleEscape, true);
    };
  }, [linkPopoverOpen, closeLinkPopover]);

  useEffect(() => {
    if (!isActiveEditor || __GOOSE_EDITOR_COMPACT__) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        isWorkspaceSettingsOpen() ||
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing
      )
        return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-shortcut-recorder]")) return;
      if (!matchShortcut(event, SELECTION_QUOTE_ADD_SHORTCUT)) return;

      if (isQuickNoteEditorPage(page)) return;

      let selectedText: string;
      try {
        selectedText = (editor.getSelectedText() ?? "").trim();
      } catch {
        selectedText = "";
      }
      const isImageNodeSelection =
        getSelectedImageUrl(editor.prosemirrorState) != null;
      if (
        !canDispatchAppendComposerSelection({
          aiEnabled: aiSettings.enabled,
          isCompact: isQuickNoteEditorPage(page),
          selectedText,
          isImageNodeSelection,
        })
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      dispatchAppendComposerSelection({
        pageId: page?.id ?? "",
        pageTitle: getPageTitle(page),
        text: selectedText,
        animate: false,
      });
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [aiSettings.enabled, editor, isActiveEditor, page]);

  const handleLinkPopoverSubmit = () => {
    const trimmed = linkPopoverUrl.trim();
    if (trimmed) {
      editor.createLink(trimmed);
    }
    closeLinkPopover();
  };

  return {
    aiSettings,
    getMentionItems,
    handleEditorKeyDownCapture,
    linkPopoverOpen,
    closeLinkPopover,
    linkPopoverUrl,
    editLinkPopover,
    linkPopoverRef,
    handleLinkPopoverSubmit,
    find: overlays.find,
    closeFindBar,
  };
}
