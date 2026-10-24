import { snapshotEditorSelection, restoreEditorSelection } from "../utils/editorSelectionSnapshot";
import { toast } from "@/components/ui/sonner";
import { normalizeBlockNoteClipboardHtml } from "../extensions/copyCurrentBlockExtension";
import { htmlLooksLikeBlockNoteClipboard } from "../utils/multilinePaste";
import { looksLikeBlockStructure } from "../utils/clipboard";
import { isEmptyInlineBlock, focusPastedBlock } from "../utils/pasteAtCursor";
import {
  cachePasteTarget,
  shouldIsolateTitleStructurePaste,
  shouldPasteClipboardAsBlocks,
  clipboardHtmlDroppedMedia,
  pasteClipboardHtmlAsBlocks,
  withoutCopiedBlockIds,
  withoutBlockNoteClipboardIds,
  type Editor,
} from "./editorPasteBlocks";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/hooks/editorStructurePaste.ts#messages:1">`
zh-Hans:
  theNoteHasChangedPleasePasteAgain: "笔记内容已变化，请重新粘贴"
en:
  theNoteHasChangedPleasePasteAgain: "The note has changed. Please paste again."
ja:
  theNoteHasChangedPleasePasteAgain: "ノートの内容が変更されました。もう一度貼り付けてください"
`;
const t = createTranslator(messages);


export function handleEditorStructurePaste(
  editor: Editor,
  event: React.ClipboardEvent<HTMLDivElement>,
  plainText: string,
  htmlText: string,
): boolean {
  const clipboard = event.clipboardData;
  const nativeBlockNoteHtml = clipboard.getData("blocknote/html");
  const recoveredBlockNoteHtml =
    nativeBlockNoteHtml ||
    (htmlLooksLikeBlockNoteClipboard(htmlText) ? htmlText : "");
  const normalizedBlockNoteHtml = normalizeBlockNoteClipboardHtml(
    recoveredBlockNoteHtml,
  );
  {
    if (
      shouldIsolateTitleStructurePaste(editor) &&
      looksLikeBlockStructure(plainText, htmlText)
    ) {
      event.preventDefault();
      event.stopPropagation();
      const titleSelection = snapshotEditorSelection(editor.prosemirrorState);
      void (async () => {
        let blocks: any[] = [];
        try {
          if (normalizedBlockNoteHtml && normalizedBlockNoteHtml.trim()) {
            blocks = await editor.tryParseHTMLToBlocks(normalizedBlockNoteHtml);
          } else if (htmlText && htmlText.trim()) {
            blocks = await editor.tryParseHTMLToBlocks(htmlText);
          } else if (plainText) {
            blocks = await editor.tryParseMarkdownToBlocks(plainText);
          }
        } catch {
          blocks = [];
        }
        const sourceHtml = normalizedBlockNoteHtml || htmlText;
        const internal = Boolean(normalizedBlockNoteHtml) || htmlLooksLikeBlockNoteClipboard(htmlText);
        if (internal && (!blocks?.length || clipboardHtmlDroppedMedia(sourceHtml, blocks))) {
          if (!restoreEditorSelection(editor.prosemirrorView, titleSelection)) {
            toast.error(t("theNoteHasChangedPleasePasteAgain"));
            return true;
          }
          const titleBlock = editor.document[0];
          if (!titleBlock) return true;
          if (!editor.document[1]) {
            editor.insertBlocks([{ type: "paragraph", content: "" }], titleBlock, "after");
          }
          const anchor = editor.document[1];
          if (anchor) editor.setTextCursorPosition(anchor, "start");
          editor.pasteHTML(withoutBlockNoteClipboardIds(sourceHtml), true);
          return true;
        }
        if (!blocks || blocks.length === 0) return true;
        if (!restoreEditorSelection(editor.prosemirrorView, titleSelection)) {
          toast.error(t("theNoteHasChangedPleasePasteAgain"));
          return true;
        }
        const titleBlock = editor.document[0];
        if (!titleBlock) return true;
        const inserted = editor.insertBlocks(
          withoutCopiedBlockIds(blocks),
          titleBlock,
          "after",
        );
        const last = inserted[inserted.length - 1];
        if (last) focusPastedBlock(editor, last);
      })();
      return true;
    }
  }

  if (normalizedBlockNoteHtml) {
    const target = cachePasteTarget(editor);
    if (target && isEmptyInlineBlock(target)) {
      event.preventDefault();
      event.stopPropagation();
      void pasteClipboardHtmlAsBlocks(editor, normalizedBlockNoteHtml, target);
      return true;
    }

    if (normalizedBlockNoteHtml !== recoveredBlockNoteHtml) {
      event.preventDefault();
      event.stopPropagation();
      editor.pasteHTML(
        withoutBlockNoteClipboardIds(normalizedBlockNoteHtml),
        true,
      );
      return true;
    }

    if (!nativeBlockNoteHtml) {
      if (!target) return true;
      event.preventDefault();
      event.stopPropagation();
      void pasteClipboardHtmlAsBlocks(editor, normalizedBlockNoteHtml, target);
      return true;
    }

    return true;
  }

  if (shouldPasteClipboardAsBlocks(clipboard, htmlText)) {
    const target = cachePasteTarget(editor);
    if (!target) return true;
    event.preventDefault();
    event.stopPropagation();
    void pasteClipboardHtmlAsBlocks(editor, htmlText, target);
    return true;
  }

  return false;
}
