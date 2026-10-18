import { pasteInsideCurrentBlock } from "../utils/containedPaste";
import { useCallback, type MutableRefObject } from "react";
import {
  normalizeMarkdownPasteText,
  looksLikeMermaidDiagram,
} from "../utils/clipboard";
import { clipboardHasPasteableImage } from "../utils/pasteClipboardImage";
import { handleEditorStructurePaste } from "./editorStructurePaste";
import { handleEditorTextPaste } from "./editorTextPaste";
import {
  cachePasteTarget,
  plainHasGooseColumnMarkers,
  tryPasteGooseMarkdownFragment,
  type Editor,
} from "./editorPasteBlocks";
export {
  shouldPasteHtmlAsBlocks,
  shouldPasteClipboardAsBlocks,
  plainHasGooseMarkdownMarkers,
  cachePasteTarget,
  resolvePasteAnchor,
  finishPasteAtAnchor,
  pasteClipboardHtmlAsBlocks,
  tryPasteGooseMarkdownFragment,
  shouldIsolateTitleStructurePaste,
  pasteLinesAsBlocks,
  type CachedPasteTarget,
} from "./editorPasteBlocks";

type UseEditorPasteOptions = {
  editor: Editor;
  editable: boolean;
  shiftPressedRef: MutableRefObject<boolean>;
};
export function useEditorPaste({
  editor,
  editable,
  shiftPressedRef,
}: UseEditorPasteOptions) {
  const handleEditorPasteCapture = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      if (!editable) return;
      if (clipboardHasPasteableImage(event.clipboardData)) return;
      if (event.defaultPrevented) return;
      if (
        (event.target as HTMLElement | null)?.closest(".goose-code-block-node")
      )
        return;

      const clipboard = event.clipboardData;
      const plainText = normalizeMarkdownPasteText(
        clipboard.getData("text/plain"),
      );
      const htmlText = clipboard.getData("text/html");
      if (pasteInsideCurrentBlock(editor, plainText, htmlText, clipboard.getData("blocknote/html"), shiftPressedRef.current)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (shiftPressedRef.current) return;
      if (looksLikeMermaidDiagram(plainText)) {
        event.preventDefault();
        event.stopPropagation();
        editor.pasteMarkdown(`\`\`\`mermaid\n${plainText.trim()}\n\`\`\``);
        return;
      }

      if (handleEditorStructurePaste(editor, event, plainText, htmlText))
        return;
      if (!plainText) return;
      if (plainHasGooseColumnMarkers(plainText)) {
        const target = cachePasteTarget(editor);
        if (target && tryPasteGooseMarkdownFragment(editor, plainText, target)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
      handleEditorTextPaste(editor, event, plainText, htmlText);
    },
    [editable, editor],
  );

  return { handleEditorPasteCapture };
}
