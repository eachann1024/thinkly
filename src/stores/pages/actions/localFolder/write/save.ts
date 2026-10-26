import { finishSettingsOnlySave } from "@/lib/note-metadata/settingsSave";
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
import { i18nYaml } from "@/i18n/core";
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
import { pickPersistedBlockProps } from "@/lib/export/markdown/blockPropsProperties";
import { serializeLocalSave } from "./serialization";
import { stageMetadata } from "@/lib/note-metadata/storage";
import { replaceNoteMarkdown } from "@/lib/note-metadata/writeMarkdown";
import {
  isLocalMdUnchanged,
  getLocalMdSnapshot,
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
import { localSaveSnapshotIsCurrent, resolveLocalSaveCompletion, shouldClearDirtyAfterLocalSave } from "./saveSnapshot";
import { getLocalSavePageState } from "../../../folderSyncRegistry";

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
  const collapseEmpty = sourceIsEmpty && content.length <= 1 &&
    content.every((block: { props?: Record<string, unknown> }) => Object.keys(pickPersistedBlockProps(block.props)).length === 0);
  const markdownContent = collapseEmpty ? "" : await blocksToMarkdown(
    encodeLocalBlockPropsWrappers(processedContent as any, { preserveEmptyParagraphs: !collapseEmpty }),
  );
  assertEmptySerializationIsExpected(sourceIsEmpty, processedContent, markdownContent, filePath);

  const serialized = await serializeLocalSave(page, filePath, markdownContent);
  const { diskContent, frontmatter: frontmatterBlob, metadata, root, settingsSaveToken } = serialized;

  if (!metadata && !options?.createOnly && !page.editorDraft && isLocalMdUnchanged(filePath, diskContent)) {
    const alreadyOnDisk = gooseFs.existsAsync
      ? await gooseFs.existsAsync(filePath)
      : gooseFs.exists(filePath);
    if (alreadyOnDisk) {
      set((s) => {
        const current = s.pages[pageId];
        const snapshotIsCurrent = localSaveSnapshotIsCurrent(page, current, content, filePath);
        const hasQueuedSave = getLocalSavePageState(pageId).pending.status !== "empty";
        return shouldClearDirtyAfterLocalSave(snapshotIsCurrent, hasQueuedSave)
          ? { dirtyLocalPageIds: { ...s.dirtyLocalPageIds, [pageId]: false } }
          : s;
      });
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
  let previousMarkdown: string | null = null;
  let metadataRevision = page.localMetadataRevision;
  if (metadata && root) {
    if (!options?.createOnly && !page.editorDraft) {
      if (!gooseFs.readFileAsync) throw new Error("当前宿主不支持读取元数据保存基线");
      previousMarkdown = await gooseFs.readFileAsync(filePath);
      if (previousMarkdown === null) throw new Error("无法读取笔记，已停止保存");
      if (!options?.force && previousMarkdown !== getLocalMdSnapshot(filePath)) {
        throw new Error("笔记已被外部修改，已停止保存");
      }
    }
    const receipt = await stageMetadata(gooseFs, root, previousMarkdown, metadata,
      page.localMetadataRevision ?? null);
    metadataRevision = receipt.revision;
    markSelfWrite(receipt.path);
    set((state) => {
      const current = state.pages[pageId];
      if (!current || current.localFilePath !== filePath) return state;
      return { pages: { ...state.pages, [pageId]: { ...current, localMetadataRevision: receipt.revision } } };
    });
  }
  markSelfWrite(filePath);
  let result: boolean;
  try {
    if (options?.createOnly || page.editorDraft) {
      if (!window.gooseFs?.createFileAsync) throw new Error("当前宿主不支持安全新建文件");
      result = await window.gooseFs.createFileAsync(filePath, diskContent);
    } else if (metadata && previousMarkdown !== null) {
      result = await replaceNoteMarkdown(gooseFs, filePath, diskContent, previousMarkdown);
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
    const nextFrontmatter = frontmatterBlob;
    set((s) => {
      const current = s.pages[pageId];
      if (!current) {
        return {
          lastSavedAt: Date.now(),
        };
      }
      const hasQueuedSave = getLocalSavePageState(pageId).pending.status !== "empty";
      const completion = resolveLocalSaveCompletion(
        page,
        current,
        content,
        filePath,
        Boolean(options?.createOnly || page.editorDraft),
        hasQueuedSave,
      );
      const { snapshotIsCurrent, clearDraftFlags: createdTargetStillBelongsToPage } = completion;
      const frontmatterChanged =
        (current.localFrontmatter ?? undefined) !==
        (nextFrontmatter ?? undefined);
      return {
        lastSavedAt: Date.now(),
        dirtyLocalPageIds: completion.clearDirty
          ? { ...s.dirtyLocalPageIds, [pageId]: false }
          : s.dirtyLocalPageIds,
        ...(createdTargetStillBelongsToPage || snapshotIsCurrent && (frontmatterChanged || current.editorDraft || current.localUnsaved || metadata && (current.localMetadataId !== metadata.noteId || current.localMetadataRevision !== metadataRevision))
          ? {
              pages: {
                ...s.pages,
                [pageId]: {
                  ...current,
                  ...(createdTargetStillBelongsToPage ? { editorDraft: undefined, localUnsaved: undefined } : {}),
                  ...(snapshotIsCurrent ? {
                    localFrontmatter: nextFrontmatter || undefined,
                    ...(metadata ? { localMetadataId: metadata.noteId, localMetadataRevision: metadataRevision } : {}),
                  } : {}),
                },
              },
            }
          : {}),
      };
    });
    finishSettingsOnlySave(pageId, settingsSaveToken);
    if (page.editorDraft) {
      const materialized = get().pages[pageId];
      if (
        materialized &&
        materialized.workspaceId === page.workspaceId &&
        materialized.localFilePath === filePath &&
        !materialized.editorDraft
      ) {
        persistPageSnapshot(materialized);
        appendLocalFolderOrderEntries(materialized.workspaceId, [materialized]);
      }
    }
    updateSnapshotAfterWrite(filePath, diskContent);
    await refreshSnapshotFingerprint(filePath);
  }
  return result;
};
