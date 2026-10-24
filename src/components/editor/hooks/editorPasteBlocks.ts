import { Fragment, Slice } from "@tiptap/pm/model";
import type { useCreateBlockNote } from "@blocknote/react";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { importMarkdownFragment } from "@/lib/export/markdown/parse";
import { restoreBlockPropsMarkers } from "@/lib/export/markdown/blockPropsMarker";
import { htmlHasNonDefaultGooseBlockAttrs } from "../utils/clipboard";
import { toast } from "@/components/ui/sonner";
import { snapshotEditorSelection, restoreEditorSelection, type EditorSelectionSnapshot } from "../utils/editorSelectionSnapshot";
import { htmlLooksLikeBlockNoteClipboard } from "../utils/multilinePaste";
import { GooseBlockSelection, selectedBlockRoots } from "../extensions/blockSelectionModel";
import { planMultilinePaste } from "../utils/multilinePaste";
import {
  focusPastedBlock,
  isEmptyInlineBlock,
  pasteBlocksAtCursor,
} from "../utils/pasteAtCursor";
import { GOOSE_BLOCKNOTE_BLOCK_COPY_MIME } from "../extensions/copyCurrentBlockExtension";
import { selectionIsInsideFirstTitleBlock } from "../toolbars/formatting/helpers";
import { normalizeParsedImageProps } from "../blocks/image/imageCaption";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/hooks/editorPasteBlocks.ts#messages:1">`
zh-Hans:
  theNoteHasChangedPleasePasteAgain: "笔记内容已变化，请重新粘贴"
en:
  theNoteHasChangedPleasePasteAgain: "The note has changed. Please paste again."
ja:
  theNoteHasChangedPleasePasteAgain: "ノートの内容が変更されました。もう一度貼り付けてください"
`;
const t = createTranslator(messages);


export type Editor = ReturnType<typeof useCreateBlockNote>;

export type CachedPasteTarget = {
  id: string;
  type?: string;
  content?: unknown;
  selection?: EditorSelectionSnapshot;
};

export function shouldPasteHtmlAsBlocks(
  htmlText: string,
  hasGooseBlockCopyMime = false,
): boolean {
  if (hasGooseBlockCopyMime) return true;
  return htmlHasNonDefaultGooseBlockAttrs(htmlText);
}

export function shouldPasteClipboardAsBlocks(
  clipboard: DataTransfer,
  htmlText: string,
): boolean {
  if (clipboard.getData("blocknote/html")) return false;
  if (clipboard.getData(GOOSE_BLOCKNOTE_BLOCK_COPY_MIME)) return true;
  return shouldPasteHtmlAsBlocks(htmlText);
}

export function plainHasGooseColumnMarkers(plain: string): boolean {
  if (/<!--\s*(?:thinkly|goose-note):columns\b/i.test(plain)) return true;
  const frontmatter = plain.match(/^---\n([\s\S]*?)\n---/);
  return Boolean(frontmatter && /goose-note:/.test(frontmatter[1]) && /columns/.test(frontmatter[1]));
}

export function plainHasGooseMarkdownMarkers(plain: string): boolean {
  return (
    plainHasGooseColumnMarkers(plain) ||
    /goose-note:/i.test(plain) ||
    /(?:thinkly|goose-note):block-props|data-(?:thinkly|goose)-note-block-props/i.test(plain) ||
    /<span[^>]*style\s*=/i.test(plain)
  );
}

export function cachePasteTarget(editor: Editor): CachedPasteTarget | null {
  try {
    const block = editor.getTextCursorPosition().block;
    return { id: block.id, type: block.type, content: block.content,
      selection: snapshotEditorSelection(editor.prosemirrorState) };
  } catch {
    return null;
  }
}

export function resolvePasteAnchor(
  editor: { getBlock: (id: string) => unknown },
  target: CachedPasteTarget,
): CachedPasteTarget | null {
  return (editor.getBlock(target.id) as CachedPasteTarget | undefined) ?? null;
}

export function finishPasteAtAnchor(
  editor: Editor,
  blocks: unknown[],
  target: CachedPasteTarget,
): boolean {
  if (target.selection && !restoreEditorSelection(editor.prosemirrorView, target.selection)) {
    toast.error(t("theNoteHasChangedPleasePasteAgain"));
    return false;
  }
  const anchor = resolvePasteAnchor(editor, target);
  if (!anchor) return false;
  if (!editor.prosemirrorState.selection.empty) {
    editor.pasteHTML(editor.blocksToFullHTML(blocks as any), true);
    return true;
  }
  const last = pasteBlocksAtCursor(editor, blocks, anchor);
  if (last) focusPastedBlock(editor, last);
  return last !== null;
}

const MEDIA_CLIPBOARD_TYPE = /data-content-type\s*=\s*["'](imageResize|image|video|audio|file|divider)["']/gi;

function containsClaimedTypes(blocks: unknown[], claimed: Set<string>): boolean {
  let pending = claimed.size;
  const seen = new Set<string>();
  const walk = (list: unknown[]): boolean => {
    for (let index = 0; index < list.length; index += 1) {
      const block = list[index];
      if (!block || typeof block !== "object") continue;
      const record = block as { type?: unknown; children?: unknown };
      const type = record.type;
      if (typeof type === "string" && claimed.has(type) && !seen.has(type)) {
        seen.add(type);
        pending -= 1;
        if (pending === 0) return true;
      }
      if (Array.isArray(record.children) && walk(record.children)) return true;
    }
    return false;
  };
  return walk(blocks);
}

export function clipboardHtmlDroppedMedia(html: string, blocks: unknown[]): boolean {
  const claimed = new Set<string>();
  MEDIA_CLIPBOARD_TYPE.lastIndex = 0;
  for (const match of html.matchAll(MEDIA_CLIPBOARD_TYPE)) claimed.add(match[1]);
  if (!claimed.size) return false;
  return !containsClaimedTypes(blocks, claimed);
}

export function withoutCopiedBlockIds(blocks: unknown[]): unknown[] {
  return blocks.map((block) => {
    if (!block || typeof block !== "object" || Array.isArray(block))
      return block;
    const copy = { ...(block as Record<string, unknown>) };
    delete copy.id;
    if (copy.type === "image" && copy.props && typeof copy.props === "object") {
      copy.props = normalizeParsedImageProps(
        copy.props as Record<string, unknown>,
      );
    }
    if (Array.isArray(copy.children)) {
      copy.children = withoutCopiedBlockIds(copy.children);
    }
    return copy;
  });
}

export function withoutBlockNoteClipboardIds(html: string): string {
  if (!html || typeof DOMParser === "undefined") return html;
  const document = new DOMParser().parseFromString(html, "text/html");
  for (const block of document.querySelectorAll<HTMLElement>(
    '[data-node-type="blockContainer"]',
  )) {
    block.removeAttribute("data-id");
    block.removeAttribute("id");
  }
  return document.body.innerHTML;
}

export async function pasteClipboardHtmlAsBlocks(
  editor: Editor,
  htmlText: string,
  target: CachedPasteTarget,
): Promise<boolean> {
  if (target.selection && !target.selection.bookmark.resolve(target.selection.doc).empty && htmlLooksLikeBlockNoteClipboard(htmlText)) {
    if (!restoreEditorSelection(editor.prosemirrorView, target.selection)) {
      toast.error(t("theNoteHasChangedPleasePasteAgain"));
      return false;
    }
    editor.pasteHTML(withoutBlockNoteClipboardIds(htmlText), true);
    return true;
  }
  let blocks: unknown[];
  try {
    blocks = await editor.tryParseHTMLToBlocks(htmlText);
  } catch {
    blocks = [];
  }
  const internal = htmlLooksLikeBlockNoteClipboard(htmlText);
  if (internal && (!blocks.length || clipboardHtmlDroppedMedia(htmlText, blocks))) {
    if (target.selection && !restoreEditorSelection(editor.prosemirrorView, target.selection)) {
      toast.error(t("theNoteHasChangedPleasePasteAgain"));
      return false;
    }
    editor.pasteHTML(withoutBlockNoteClipboardIds(htmlText), true);
    return true;
  }
  if (!blocks || blocks.length === 0) return false;
  return finishPasteAtAnchor(editor, withoutCopiedBlockIds(blocks), target);
}

export function tryPasteGooseMarkdownFragment(
  editor: Editor,
  plainText: string,
  target: CachedPasteTarget,
): boolean {
  const fragment = importMarkdownFragment(plainText);
  if (!fragment || fragment.length === 0) return false;
  const restored = restoreBlockPropsMarkers(fragment as BlockNoteContent);
  return finishPasteAtAnchor(editor, restored, target);
}
export function shouldIsolateTitleStructurePaste(editor: {
  prosemirrorState: Editor["prosemirrorState"];
}): boolean {
  return selectionIsInsideFirstTitleBlock(editor as Editor);
}

export function isMultiBlockTextSelection(editor: Editor): boolean {
  try {
    if (editor.prosemirrorState.selection instanceof GooseBlockSelection) {
      return selectedBlockRoots(editor.prosemirrorState).length > 1;
    }
    return (editor.getSelection()?.blocks?.length ?? 0) > 1;
  } catch {
    return false;
  }
}

export function getCursorBlockType(editor: Editor): string | null {
  try {
    return editor.getTextCursorPosition().block.type ?? null;
  } catch {
    return null;
  }
}

export function insertPlainInline(editor: Editor, text: string) {
  const pmState = editor.prosemirrorState;
  const schema = pmState.schema;
  const nodes = text.length > 0 ? [schema.text(text)] : [];
  const slice = new Slice(Fragment.fromArray(nodes), 0, 0);
  editor.prosemirrorView.dispatch(
    pmState.tr.replaceSelection(slice).scrollIntoView(),
  );
}

export function pasteLinesAsBlocks(
  editor: Editor,
  lines: string[],
  currentBlockType: string | null,
) {
  const { firstLine, restBlocks } = planMultilinePaste(lines, currentBlockType);
  const current = editor.getTextCursorPosition().block;

  if (
    isEmptyInlineBlock(current) &&
    firstLine === "" &&
    restBlocks.length > 0
  ) {
    const last = pasteBlocksAtCursor(editor, restBlocks, current);
    if (last) focusPastedBlock(editor, last);
    return;
  }

  const pmState = editor.prosemirrorState;
  if (firstLine) {
    editor.prosemirrorView.dispatch(
      pmState.tr.insertText(firstLine).scrollIntoView(),
    );
  } else if (pmState.selection.from !== pmState.selection.to) {
    editor.prosemirrorView.dispatch(
      pmState.tr.deleteSelection().scrollIntoView(),
    );
  }
  if (restBlocks.length === 0) return;

  const anchor = editor.getTextCursorPosition().block;
  const last = pasteBlocksAtCursor(editor, restBlocks, anchor);
  if (last) focusPastedBlock(editor, last);
}
