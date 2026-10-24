import { insertContainedBlocks } from "./containedPaste";
import type { BlockNoteEditor } from "@blocknote/core";
import type { PartialBlock } from "@blocknote/core/blocks";
import { materializeImageBlob } from "@/lib/imageProcessor";
import {
  isPasteableClipboardImageFile,
  isPasteableClipboardVideoFile,
  extractClipboardFiles,
  resolveImageMimeForUpload,
} from "./pasteClipboardImage";
import { toast } from "@/components/ui/sonner";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/utils/pasteClipboardFilesFromClipboard.ts#messages:1">`
zh-Hans:
  couldNotPasteTheVideoPleaseTryAgain: "视频粘贴失败，请稍后重试"
  couldNotPasteTheImagePleaseTryAgain: "图片粘贴失败，请稍后重试"
en:
  couldNotPasteTheVideoPleaseTryAgain: "Could not paste the video. Please try again later."
  couldNotPasteTheImagePleaseTryAgain: "Could not paste the image. Please try again later."
ja:
  couldNotPasteTheVideoPleaseTryAgain: "ビデオを貼り付けられませんでした。しばらくしてからもう一度お試しください"
  couldNotPasteTheImagePleaseTryAgain: "画像を貼り付けられませんでした。しばらくしてからもう一度お試しください"
`;
const t = createTranslator(messages);


function insertOrUpdateBlock(
  editor: BlockNoteEditor<any, any, any>,
  referenceBlock: { id: string; content?: unknown },
  newBlock: PartialBlock<any, any, any>,
  placement: "before" | "after" = "after",
): string {
  const contained = insertContainedBlocks(editor, [newBlock]);
  if (contained?.length) return contained[0];
  const ref = referenceBlock as Parameters<typeof editor.updateBlock>[0];
  if (
    Array.isArray(referenceBlock.content) &&
    referenceBlock.content.length === 0
  ) {
    return editor.updateBlock(ref, newBlock).id;
  }
  return editor.insertBlocks([newBlock], ref, placement)[0].id;
}

function resolveImageBlockType(editor: BlockNoteEditor<any, any, any>): string {
  if (editor.schema.blockSpecs.imageResize) return "imageResize";
  return "image";
}

function insertPastedMediaPlaceholder(
  editor: BlockNoteEditor<any, any, any>,
  referenceBlock: { id: string; content?: unknown },
  fileBlock: PartialBlock<any, any, any>,
): string {
  return editor.transact(() => {
    const insertedBlockId = insertOrUpdateBlock(
      editor,
      referenceBlock,
      fileBlock,
    );

    try {
      const last = editor.document.at(-1);
      if (last?.id === insertedBlockId) {
        editor.insertBlocks(
          [{ type: "paragraph", content: "" }],
          insertedBlockId,
          "after",
        );
      }
    } catch {
    }

    return insertedBlockId;
  });
}

function commitPastedMediaWithoutHistory(
  editor: BlockNoteEditor<any, any, any>,
  blockId: string,
  update: PartialBlock<any, any, any>,
): void {
  editor.transact((tr) => {
    tr.setMeta("addToHistory", false);
    editor.updateBlock(blockId, update);
  });
}

export async function pasteNativeClipboardImage(
  editor: BlockNoteEditor<any, any, any>,
  readImage: () => Promise<string | null>,
): Promise<void> {
  const dataUrl = await readImage();
  if (!dataUrl) return;
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  if (!blob.size) return;
  const type = blob.type.startsWith("image/") ? blob.type : "image/png";
  await pasteClipboardMedia(editor, [{
    file: new File([blob], "pasted.png", { type }),
    mime: type,
  }]);
}

export async function pasteClipboardFilesFromClipboard(
  event: ClipboardEvent,
  editor: BlockNoteEditor<any, any, any>,
): Promise<void> {
  const files = extractClipboardFiles(event.clipboardData);
  if (!files.length || !editor.uploadFile) return;

  event.preventDefault();

  await pasteClipboardMedia(editor, files);
}

export async function pasteClipboardMedia(
  editor: BlockNoteEditor<any, any, any>,
  files: { file: File; mime: string }[],
): Promise<void> {
  if (!editor.uploadFile) return;
  let currentBlock = editor.getTextCursorPosition().block;
  const uploads: { file: File; mime: string; isVideo: boolean; insertedBlockId: string }[] = [];
  for (const { file, mime } of files) {
    const isImage = isPasteableClipboardImageFile(file, mime);
    const editorCompact =
      typeof __GOOSE_EDITOR_COMPACT__ !== "undefined" &&
      __GOOSE_EDITOR_COMPACT__;
    const isVideo =
      !editorCompact && isPasteableClipboardVideoFile(file, mime);
    if (!isImage && !isVideo) continue;

    const type = isVideo ? "video" : resolveImageBlockType(editor);

    const fileBlock = {
      type,
      props: { name: file.name || (isVideo ? "video.mp4" : "image.webp") },
    } as PartialBlock<any, any, any>;

    const insertedBlockId = insertPastedMediaPlaceholder(
      editor,
      currentBlock,
      fileBlock,
    );

    currentBlock = editor.getBlock(insertedBlockId)!;
    editor.setTextCursorPosition(currentBlock, "end");
    uploads.push({ file, mime, isVideo, insertedBlockId });
  }

  for (const { file, mime, isVideo, insertedBlockId } of uploads) {
    try {
      const materialized = isVideo ? file : await materializeImageBlob(
        file, mime.startsWith("image/") ? mime : resolveImageMimeForUpload(file),
      );
      const uploadFile = isVideo ? file : new File(
        [materialized], file.name || `paste-${Date.now()}.png`,
        { type: materialized.type },
      );
      const updateData = await editor.uploadFile(uploadFile, insertedBlockId);
      if (!editor.getBlock(insertedBlockId)) continue;
      const updatedFileBlock =
        typeof updateData === "string"
          ? ({ props: { url: updateData } } as PartialBlock<any, any, any>)
          : { ...updateData };
      commitPastedMediaWithoutHistory(editor, insertedBlockId, updatedFileBlock);
    } catch (err) {
      if (!editor.getBlock(insertedBlockId)) continue;
      console.error("[pasteClipboardFiles] upload failed", err);
      editor.removeBlocks([insertedBlockId]);
      const message =
        err instanceof Error && err.message
          ? err.message
          : isVideo
            ? t("couldNotPasteTheVideoPleaseTryAgain")
            : t("couldNotPasteTheImagePleaseTryAgain");
      toast.error(message);
    }
  }
}
