import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/actions/localFolder/write/emptySaveGuard.ts#block1:1">`
zh-Hans:
  serializeBlocked: "笔记内容未能完整序列化，已阻止保存，原文件未更改。"
  readBlocked: "此文件读取或解析失败，已阻止保存，请重新载入后重试。"
  emptyReadBlocked: "无法读取磁盘原文，已阻止清空保存，请重新载入后重试。"
  emptyPathChanged: "页面或保存路径已变化，本次清空未写入磁盘，请重试。"
  emptyExternalConflict: "磁盘原文已被外部修改，已阻止清空。请先处理文件冲突。"
  emptyNewerContent: "页面已有更新内容，本次清空未写入磁盘，请重新保存。"
  emptyRecoveryFailed: "无法读取编辑恢复记录，已阻止清空原文件，请重试。"
  emptyUnconfirmed: "尚未确认本次清空编辑，已保留磁盘原文。请重新编辑后保存。"
en:
  serializeBlocked: "The note content couldn’t be fully serialized. Saving was blocked and the original file is unchanged."
  readBlocked: "The file couldn’t be read or parsed. Saving was blocked. Reload and try again."
  emptyReadBlocked: "The original content on disk couldn’t be read. Saving an empty note was blocked. Reload and try again."
  emptyPathChanged: "The page or save path has changed. The empty content was not written to disk. Please try again."
  emptyExternalConflict: "The file on disk was changed externally. Saving an empty note was blocked. Resolve the file conflict first."
  emptyNewerContent: "The page has newer content. The empty content was not written to disk. Save again."
  emptyRecoveryFailed: "The recovery record couldn’t be read. Clearing the original file was blocked. Please try again."
  emptyUnconfirmed: "Clearing this note hasn’t been confirmed. The original content on disk was preserved. Edit and save again."
ja:
  serializeBlocked: "ノートの内容を完全にシリアライズできなかったため、保存を中止しました。元のファイルは変更されていません。"
  readBlocked: "このファイルの読み込みまたは解析に失敗したため、保存を中止しました。再読み込みしてからもう一度お試しください。"
  emptyReadBlocked: "ディスク上の元の内容を読み込めないため、空にする保存を中止しました。再読み込みしてからもう一度お試しください。"
  emptyPathChanged: "ページまたは保存先のパスが変更されたため、今回の空にする操作はディスクに書き込まれていません。もう一度お試しください。"
  emptyExternalConflict: "ディスク上の元の内容が外部で変更されたため、空にする操作を中止しました。先にファイルの競合を解決してください。"
  emptyNewerContent: "ページにより新しい内容があるため、今回の空にする操作はディスクに書き込まれていません。もう一度保存してください。"
  emptyRecoveryFailed: "編集の復元記録を読み込めないため、元のファイルを空にする操作を中止しました。もう一度お試しください。"
  emptyUnconfirmed: "今回の空にする編集は確認されていないため、ディスク上の元の内容を保持しました。もう一度編集してから保存してください。"
`);
import type { JSONContent, Page } from "@/types";
import { getContentSignature } from "@/components/editor/utils/blocknote-content";
import { DiskWriteError } from "@/lib/diskWriteError";
import { extractFrontmatter } from "@/lib/markdown-raw-guard";
import { isDiskContentMatchingSnapshot } from "@/lib/local-md-snapshot";
import { getRecoveryEntry } from "@/lib/storage/recoveryJournal";
import { cloneLocalPageContent } from "../../create/content";
import type { StoreGet } from "../../hydrate";

const EMPTY_BLOCK_KEYS = new Set(["id", "type", "props", "content", "children"]);
const EMPTY_TEXT_KEYS = new Set(["type", "text", "styles"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isEmptyInline(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value === "string") return !value.trim();
  return Array.isArray(value) && Array.from(value).every((item) =>
    typeof item === "string" ? !item.trim() : isRecord(item) &&
      Object.keys(item).every((key) => EMPTY_TEXT_KEYS.has(key)) &&
      item.type === "text" && typeof item.text === "string" && !item.text.trim() &&
      (item.styles === undefined || isRecord(item.styles)),
  );
}

export function isEmptyParagraphDocument(value: unknown): value is JSONContent & unknown[] {
  return Array.isArray(value) && Array.from(value).every((block) =>
    isRecord(block) && Object.keys(block).every((key) => EMPTY_BLOCK_KEYS.has(key)) &&
    block.type === "paragraph" && (block.id === undefined || typeof block.id === "string") &&
    (block.props === undefined || isRecord(block.props)) && isEmptyInline(block.content) &&
    (block.children === undefined || (Array.isArray(block.children) && !block.children.length)),
  );
}

export function assertEmptySerializationIsExpected(
  sourceIsEmpty: boolean, processedContent: unknown, markdown: string, filePath: string,
): void {
  if (!markdown.trim() && (!sourceIsEmpty || !isEmptyParagraphDocument(processedContent))) {
    throw new DiskWriteError(storeText("serializeBlocked"), { path: filePath });
  }
}

export function assertLocalPageReadable(page: Page | undefined, filePath: string): void {
  if (page?.localReadState === "error") {
    throw new DiskWriteError(storeText("readBlocked"), { path: filePath });
  }
}

export async function prepareEmptyLocalWrite(
  get: StoreGet, gooseFs: GooseFs, page: Page, filePath: string,
  content: JSONContent, markdown: string, force = false,
): Promise<() => void> {
  if (markdown.trim()) return () => {};
  let oldContent = "";
  try {
    const exists = gooseFs.existsAsync
      ? await gooseFs.existsAsync(filePath) : gooseFs.exists(filePath);
    if (exists) {
      const read = gooseFs.readFileAsync
        ? await gooseFs.readFileAsync(filePath) : gooseFs.readFile(filePath);
      if (typeof read !== "string") throw new Error("markdown-read-failed");
      oldContent = read;
    }
  } catch (cause) {
    throw new DiskWriteError(storeText("emptyReadBlocked"), { path: filePath, cause });
  }

  return () => {
    const latest = get().pages[page.id];
    assertLocalPageReadable(latest, filePath);
    if (!latest || latest.workspaceId !== page.workspaceId ||
      get().getLocalFilePath(page.id) !== filePath) {
      throw new DiskWriteError(storeText("emptyPathChanged"), { path: filePath });
    }
    if (!force && !isDiskContentMatchingSnapshot(filePath, oldContent)) {
      window.dispatchEvent(new CustomEvent("goose-note:local-file-conflict", {
        detail: { pageId: page.id, filePath, source: "pre-write" },
      }));
      throw new DiskWriteError(storeText("emptyExternalConflict"), { path: filePath });
    }
    const signature = getContentSignature(cloneLocalPageContent(content));
    if (signature === "__goose-note-unserializable-content__" ||
      !isEmptyParagraphDocument(latest.content) ||
      getContentSignature(cloneLocalPageContent(latest.content)) !== signature) {
      throw new DiskWriteError(storeText("emptyNewerContent"), { path: filePath });
    }
    if (!extractFrontmatter(oldContent).body.trim()) return;

    let confirmed: boolean;
    try {
      const entry = getRecoveryEntry("local-file", page.id);
      confirmed = isEmptyParagraphDocument(content) && content.length > 0 &&
        Boolean(entry && isEmptyParagraphDocument(entry.content) &&
          getContentSignature(cloneLocalPageContent(entry.content)) === signature);
    } catch (cause) {
      throw new DiskWriteError(storeText("emptyRecoveryFailed"), { path: filePath, cause });
    }
    if (!confirmed) {
      throw new DiskWriteError(storeText("emptyUnconfirmed"), { path: filePath });
    }
  };
}
