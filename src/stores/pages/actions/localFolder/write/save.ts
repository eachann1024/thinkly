import { isStandaloneFile } from "@/lib/standaloneFileCapabilities";
import { createTranslator as extraTranslator } from "@/i18n/core";
const extraText = extraTranslator(i18nYaml<"src/stores/pages/actions/localFolder/write/save.ts#block1:1">`
zh-Hans:
  writeFailed: "无法写入文件：{{path}}"
en:
  writeFailed: "Couldn’t write the file: {{path}}"
ja:
  writeFailed: "ファイルに書き込めません：{{path}}"
`);
import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/actions/localFolder/write/save.ts#block2:2">`
zh-Hans:
  invalidFrontmatterSave: "YAML 前置区格式异常，已阻止保存"
en:
  invalidFrontmatterSave: "The YAML frontmatter is invalid. Saving was blocked."
ja:
  invalidFrontmatterSave: "YAML フロントマターの形式が正しくないため、保存を中止しました"
`);
import type { StoreSet, StoreGet } from "../../hydrate";
import type { JSONContent } from "@/types";
import { localPageHasPersistableContent } from "@/lib/unsavedLocalPage";
import {
  assignUnsavedLocalFilePathAction,
  cloneLocalPageContent,
} from "../../pageCreate";
import { findDuplicateLocalFileOwner } from "../pathGuards";
import { collectLocalImageWrites } from "./images";
import { encodeLocalBlockPropsWrappers } from "@/lib/export/markdown/blockPropsMarker";
import { stripNoteMetaBlob } from "@/lib/export/markdown/noteMeta";
import {
  mergeSettingsIntoFrontmatterHeader,
  mergeLocalPageSettingsIntoFrontmatter,
} from "@/lib/local-frontmatter";
import {
  decodeUnsupportedMarkdownForDisk,
} from "@/lib/markdown-raw-guard";
import {
  applyTrailingNewlineStyle,
  isLocalMdUnchanged,
  markSelfWrite,
  updateSnapshotAfterWrite,
} from "@/lib/local-md-snapshot";
import { hasExternalDiskChange } from "./conflict";
import { consumeDiskWriteFailure, DiskWriteError } from "@/lib/diskWriteError";
import { refreshSnapshotFingerprint } from "./persistence";
import { persistPageSnapshot } from "../../../persistence";
import { appendLocalFolderOrderEntries } from "@/stores/localFolderOrder";
import { validateEditorDraftTarget } from "../../create/validateEditorDraftTarget";
import {
  prepareEmptyLocalWrite, assertEmptySerializationIsExpected,
  assertLocalPageReadable, isEmptyParagraphDocument,
} from "./emptySaveGuard";

export const saveLocalPageContentUnlocked = async (
  set: StoreSet,
  get: StoreGet,
  gooseFs: NonNullable<Window["gooseFs"]>,
  pageId: string,
  content: JSONContent,
  options?: { force?: boolean; createOnly?: boolean },
): Promise<boolean> => {
  const page = get().pages[pageId];
  if (!page) return false;
  assertLocalPageReadable(page, page.localFilePath ?? "");

  let filePath = get().getLocalFilePath(pageId);
  if (page.editorDraft && filePath) await validateEditorDraftTarget(get, pageId, filePath);
  if (!filePath) {
    if (!page.localUnsaved) return false;
    if (!localPageHasPersistableContent(content) && !options?.force) {
      set((state) => ({ dirtyLocalPageIds: { ...state.dirtyLocalPageIds, [pageId]: false } }));
      return true;
    }
    filePath = await assignUnsavedLocalFilePathAction(set, get, pageId);
    if (!filePath) return false;
  }

  const duplicatePage = findDuplicateLocalFileOwner(
    get().pages,
    pageId,
    filePath,
  );
  if (duplicatePage) {
    console.error("[local-folder] refusing to save duplicate local file path", {
      pageId,
      duplicatePageId: duplicatePage.id,
      filePath,
    });
    window.dispatchEvent(
      new CustomEvent("goose-note:local-file-duplicate", {
        detail: {
          pageId,
          duplicatePageId: duplicatePage.id,
          filePath,
        },
      }),
    );
    return false;
  }

  const sourceIsEmpty = isEmptyParagraphDocument(content);
  const processedContent = cloneLocalPageContent(content);

  const assetsDir = filePath.replace(/[^\/\\]+$/, "") + "assets";

  const pendingImageWrites = isStandaloneFile(page) ? [] : collectLocalImageWrites(
    processedContent,
    assetsDir,
  );

  const { blocksToMarkdown } = await import("@/lib/export");
  const markdownContent = sourceIsEmpty ? "" : await blocksToMarkdown(
    encodeLocalBlockPropsWrappers(processedContent as any, { preserveEmptyParagraphs: !sourceIsEmpty }),
  );
  assertEmptySerializationIsExpected(sourceIsEmpty, processedContent, markdownContent, filePath);

  const frontmatterHeaderMerge = mergeSettingsIntoFrontmatterHeader(
    markdownContent,
    {
      fontFamily: page.fontFamily ?? "default",
      pageLayout: page.pageLayout,
      isLocked: Boolean(page.isLocked),
      isPinned: Boolean(page.isPinned),
      isFavorite: Boolean(page.isFavorite),
    },
  );
  let frontmatterBlob: string | undefined;
  let finalContent: string;
  if (frontmatterHeaderMerge) {
    finalContent = frontmatterHeaderMerge.markdown;
    frontmatterBlob = frontmatterHeaderMerge.frontmatter;
  } else {
    const frontmatterMerge = mergeLocalPageSettingsIntoFrontmatter(
      page.localFrontmatter,
      {
        fontFamily: page.fontFamily ?? "default",
        pageLayout: page.pageLayout,
        isLocked: Boolean(page.isLocked),
        isPinned: Boolean(page.isPinned),
        isFavorite: Boolean(page.isFavorite),
      },
    );
    if (frontmatterMerge.parseFailed) {
      throw new Error(storeText("invalidFrontmatterSave"));
    }
    frontmatterBlob = stripNoteMetaBlob(frontmatterMerge.blob);
    finalContent = frontmatterBlob
      ? `${frontmatterBlob}\n\n${markdownContent}`
      : markdownContent;
  }

  const diskContent = applyTrailingNewlineStyle(
    filePath,
    decodeUnsupportedMarkdownForDisk(finalContent),
  );

  if (isLocalMdUnchanged(filePath, diskContent)) {
    const alreadyOnDisk = gooseFs.existsAsync
      ? await gooseFs.existsAsync(filePath)
      : gooseFs.exists(filePath);
    if (alreadyOnDisk) {
      set((s) => ({
        dirtyLocalPageIds: { ...s.dirtyLocalPageIds, [pageId]: false },
      }));
      return true;
    }
  }

  if (!options?.force) {
    if (await hasExternalDiskChange(filePath, pageId, "pre-save")) return false;
  }

  if (pendingImageWrites.length > 0) {
    if (page.editorDraft) await validateEditorDraftTarget(get, pageId, filePath);
    try {
      if (gooseFs.mkdir) {
        await gooseFs.mkdir(assetsDir);
      }
    } catch {
    }
    await Promise.all(
      pendingImageWrites.map(({ imagePath, base64Data }) => {
        if (gooseFs.writeFileAsync) {
          return gooseFs.writeFileAsync(imagePath, base64Data, "base64");
        }
        return Promise.resolve(gooseFs.writeFile(imagePath, base64Data));
      }),
    );
  }

  if (
    !options?.force &&
    (await hasExternalDiskChange(filePath, pageId, "pre-write"))
  ) {
    return false;
  }

  if (page.editorDraft) await validateEditorDraftTarget(get, pageId, filePath);
  const validateEmptyWrite = await prepareEmptyLocalWrite(
    get, gooseFs, page, filePath, content, markdownContent, options?.force,
  );
  validateEmptyWrite();
  assertLocalPageReadable(get().pages[pageId], filePath);
  markSelfWrite(filePath);
  let result: boolean;
  try {
    if (options?.createOnly) {
      if (!window.gooseFs?.createFileAsync) throw new Error("当前宿主不支持安全新建文件");
      result = await window.gooseFs.createFileAsync(filePath, diskContent);
    } else if (window.gooseFs?.writeFileAsync) {
      result = await window.gooseFs.writeFileAsync(filePath, diskContent);
    } else {
      result = window.gooseFs?.writeFile(filePath, diskContent) ?? false;
    }
  } catch (err) {
    throw (
      consumeDiskWriteFailure() ??
      new DiskWriteError(extraText("writeFailed", { path: filePath }), {
        path: filePath,
        cause: err,
      })
    );
  }

  if (!result) {
    throw (
      consumeDiskWriteFailure() ??
      new DiskWriteError(extraText("writeFailed", { path: filePath }), { path: filePath })
    );
  }

  if (result) {
    markSelfWrite(filePath);
    const nextFrontmatter = frontmatterHeaderMerge
      ? frontmatterBlob ?? page.localFrontmatter
      : frontmatterBlob;
    set((s) => {
      const current = s.pages[pageId];
      if (!current) {
        return {
          lastSavedAt: Date.now(),
          dirtyLocalPageIds: { ...s.dirtyLocalPageIds, [pageId]: false },
        };
      }
      const frontmatterChanged =
        (current.localFrontmatter ?? undefined) !==
        (nextFrontmatter ?? undefined);
      return {
        lastSavedAt: Date.now(),
        dirtyLocalPageIds: { ...s.dirtyLocalPageIds, [pageId]: false },
        ...(frontmatterChanged || current.editorDraft
          ? {
              pages: {
                ...s.pages,
                [pageId]: {
                  ...current,
                  editorDraft: undefined,
                  localFrontmatter: nextFrontmatter || undefined,
                },
              },
            }
          : {}),
      };
    });
    if (page.editorDraft) {
      const materialized = get().pages[pageId];
      persistPageSnapshot(materialized);
      if (materialized) appendLocalFolderOrderEntries(materialized.workspaceId, [materialized]);
    }
    updateSnapshotAfterWrite(filePath, diskContent);
    await refreshSnapshotFingerprint(filePath);
  }
  return result;
};
