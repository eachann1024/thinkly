import { pasteClipboardMedia } from "../utils/pasteClipboardFilesFromClipboard";
import { pasteInsideCurrentBlock } from "../utils/containedPaste";
import { useCallback, useRef, type RefObject } from "react";
import { toast } from "@/components/ui/sonner";
import { useEditorPlatform } from "../platform/context";
import { getSelectedImageUrl } from "../utils/selection";
import { copyImageSrcToClipboard } from "../image/imageUtils";
import { deleteCutSelection, normalizeBlockNoteClipboardHtml } from "../extensions/copyBlockClipboard";
import { snapshotEditorSelection, restoreEditorSelection, type EditorSelectionSnapshot } from "../utils/editorSelectionSnapshot";
import { withoutBlockNoteClipboardIds, withoutCopiedBlockIds, shouldIsolateTitleStructurePaste } from "../hooks/editorPasteBlocks";
import { looksLikeBlockStructure, looksLikeMarkdownFragment, normalizeMarkdownPasteText } from "../utils/clipboard";
import { htmlLooksLikeBlockNoteClipboard } from "../utils/multilinePaste";
import { focusPastedBlock } from "../utils/pasteAtCursor";
import { writeContextClipboard } from "./contextClipboardWrite";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/menus/useEditorContextClipboard.ts#messages:1">`
zh-Hans:
  theNoteHasChangedSelectTheContentAgain: "笔记内容已变化，请重新选择后操作"
  couldNotReadOrPasteFromTheClipboard: "无法读取或粘贴剪贴板，原内容已保留"
  couldNotWriteToTheClipboardYourOriginal: "无法写入剪贴板，原内容已保留"
en:
  theNoteHasChangedSelectTheContentAgain: "The note has changed. Select the content again to continue."
  couldNotReadOrPasteFromTheClipboard: "Could not read or paste from the clipboard. Your original content was preserved."
  couldNotWriteToTheClipboardYourOriginal: "Could not write to the clipboard. Your original content was preserved."
ja:
  theNoteHasChangedSelectTheContentAgain: "ノートの内容が変更されました。もう一度選択してから操作してください"
  couldNotReadOrPasteFromTheClipboard: "クリップボードを読み取れないか、貼り付けできませんでした。元の内容は残されています"
  couldNotWriteToTheClipboardYourOriginal: "クリップボードに書き込めませんでした。元の内容は残されています"
`;
const t = createTranslator(messages);


export function useEditorContextClipboard(
  editor: any,
  editable: boolean,
  _selectedTextRef: RefObject<string>,
) {
  useLocale();
  const platform = useEditorPlatform();
  const snapshotRef = useRef<EditorSelectionSnapshot | null>(null);
  const rememberContextSelection = useCallback(() => {
    snapshotRef.current = snapshotEditorSelection(editor.prosemirrorState);
  }, [editor]);
  const restore = useCallback((snapshot: EditorSelectionSnapshot) => {
    if (restoreEditorSelection(editor.prosemirrorView, snapshot)) return true;
    toast.error(t("theNoteHasChangedSelectTheContentAgain"));
    return false;
  }, [editor]);

  const handleContextPaste = useCallback(async () => {
    if (!editable) return;
    const snapshot = snapshotRef.current ?? snapshotEditorSelection(editor.prosemirrorState);
    try {
      let html = "", nativeHtml = "", plain = "";
      const media: { file: File; mime: string }[] = [];
      try {
        for (const item of await navigator.clipboard.read()) {
          const mime = item.types.find((type) => type.startsWith("image/"));
          if (mime) {
            const blob = await item.getType(mime);
            media.push({ file: new File([blob], "clipboard-image", { type: mime }), mime });
          }
          for (const type of ["blocknote/html", "text/html", "text/plain"]) {
            if (!item.types.includes(type)) continue;
            const value = await (await item.getType(type)).text();
            if (type === "blocknote/html") nativeHtml ||= value;
            else if (type === "text/html") html ||= value;
            else plain ||= value;
          }
        }
      } catch {
        // 系统未提供多格式读取时继续尝试文本，不更改原选区或原内容。
      }
      if (!nativeHtml && htmlLooksLikeBlockNoteClipboard(html)) nativeHtml = html;
      if (!media.length && !plain && !html && !nativeHtml) plain = await platform.clipboard.readText();
      plain = normalizeMarkdownPasteText(plain);
      if (!restore(snapshot)) return;
      if (media.length) {
        await pasteClipboardMedia(editor, media);
        editor.focus();
        return;
      }
      if (pasteInsideCurrentBlock(editor, plain, html, nativeHtml)) return;
      const internal = normalizeBlockNoteClipboardHtml(nativeHtml);
      if (shouldIsolateTitleStructurePaste(editor) && looksLikeBlockStructure(plain, internal || html)) {
        const blocks = internal || html
          ? await editor.tryParseHTMLToBlocks(internal || html)
          : await editor.tryParseMarkdownToBlocks(plain);
        if (!restore(snapshot) || !blocks?.length) return;
        const inserted = editor.insertBlocks(withoutCopiedBlockIds(blocks), editor.document[0], "after");
        if (inserted.length) focusPastedBlock(editor, inserted[inserted.length - 1]);
        return;
      }
      // 原生 paste 使用缓存的精确选区和 data-pm-slice 开放边界，部分文字不会变整块追加。
      if (internal) editor.pasteHTML(withoutBlockNoteClipboardIds(internal), true);
      else if (html) editor.pasteHTML(html);
      else if (looksLikeMarkdownFragment(plain)) editor.pasteMarkdown(plain);
      else if (plain) editor.pasteText(plain);
      editor.focus();
    } catch (error) {
      console.error("[editor] Failed to paste clipboard", error);
      toast.error(t("couldNotReadOrPasteFromTheClipboard"));
    }
  }, [editable, editor, platform, restore]);

  const copyOrCut = useCallback(async (cut: boolean) => {
    if (cut && !editable) return;
    const snapshot = snapshotRef.current ?? snapshotEditorSelection(editor.prosemirrorState);
    if (!restore(snapshot)) return;
    editor.focus();
    // 优先同步事件链；其失败分支会阻止原生剪切并显示错误。
    if (document.execCommand(cut ? "cut" : "copy")) return;
    try {
      const image = getSelectedImageUrl(editor.prosemirrorState);
      if (image) await copyImageSrcToClipboard(image, platform);
      else await writeContextClipboard(editor.prosemirrorView);
      if (cut && restore(snapshot)) deleteCutSelection(editor.prosemirrorView);
    } catch (error) {
      console.error("[editor] Failed to write context clipboard", error);
      toast.error(t("couldNotWriteToTheClipboardYourOriginal"));
    }
  }, [editable, editor, platform, restore]);

  return {
    rememberContextSelection,
    handleContextPaste,
    handleCopySelection: () => { void copyOrCut(false); },
    handleCutSelection: () => { void copyOrCut(true); },
  };
}
