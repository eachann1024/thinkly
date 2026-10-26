import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/slices/updateSlice.ts#block1:1">`
zh-Hans:
  readSettingsUnchanged: "页面读取失败，未更改设置"
  yamlSettingsUnchanged: "YAML 前置区格式异常，未更改设置"
  fixYaml: "原文已保留，请先修复 YAML 后重试。"
en:
  readSettingsUnchanged: "The page couldn’t be read. Settings were not changed."
  yamlSettingsUnchanged: "The YAML frontmatter is invalid. Settings were not changed."
  fixYaml: "The original content was preserved. Fix the YAML and try again."
ja:
  readSettingsUnchanged: "ページを読み込めなかったため、設定は変更されていません"
  yamlSettingsUnchanged: "YAML フロントマターの形式が正しくないため、設定は変更されていません"
  fixYaml: "元の内容は保持されています。YAML を修正してからもう一度お試しください。"
`);
import type { PagesState } from "../types";
import {
  normalizePageLayout,
  isLocalPageFrontmatterSettingsUpdate,
  getContentFrontmatterBody,
  mergeLocalPageSettingsIntoFrontmatter,
  applyFrontmatterBodyToContent,
} from "@/lib/local-frontmatter";
import {
  isLocalFolderPage,
  shouldPersistLocalPageMetaUpdate,
  persistPageSnapshot,
} from "../persistence";
import {
  recordRecoveryEntry,
  acknowledgeRecoveryEntry,
} from "@/lib/storage/recoveryJournal";
import { getContentSignature } from "@/components/editor/utils/blocknote-content";
import { toast } from "@/components/ui/sonner";
import { localPageHasPersistableContent } from "@/lib/unsavedLocalPage";
import { queueLocalPageSave } from "../folderSync";
import { clonePageContent } from "../actions/create/content";
import { useNotebooks } from "@/stores/useNotebooks";
import { recoverySettings } from "@/lib/storage/localRecoverySettings";
import {
  clearPagePersistenceNotice,
  clearRecoveryJournalNotice,
  showPagePersistenceFailure,
  showRecoveryJournalFailure,
} from "../saveFailureNotices";

export function createUpdatePageSlice(
  set: import("zustand").StoreApi<PagesState>["setState"],
  get: import("zustand").StoreApi<PagesState>["getState"],
): Pick<PagesState, "updatePage"> {
  return {
    updatePage: (id, updates, options) => {
      if ("pageLayout" in updates) {
        updates = {
          ...updates,
          pageLayout:
            updates.pageLayout === undefined
              ? undefined
              : normalizePageLayout(updates.pageLayout),
        };
      }
      const page = get().pages[id];
      if (page?.editorDraft && !isLocalFolderPage(page) && "content" in updates) {
        updates = { ...updates, content: clonePageContent(updates.content) };
      }
      const shouldPersistLocalMeta =
        isLocalFolderPage(page) && shouldPersistLocalPageMetaUpdate(updates);
      const silent = options?.silent === true;
      const isLocal = isLocalFolderPage(page);
      const isSettingsEdit = isLocal && !silent && isLocalPageFrontmatterSettingsUpdate(updates);
      if (isSettingsEdit && page?.localReadState === "error") {
        toast.error(storeText("readSettingsUnchanged"));
        return;
      }
      const hasSidecarRoot = Boolean(page && useNotebooks.getState().notebooks[page.workspaceId]?.localPath);
      const isDurableContentEdit =
        Boolean(page) && "content" in updates && !silent &&
        (!page?.editorDraft || localPageHasPersistableContent(updates.content) ||
          localPageHasPersistableContent(page.content));
      const baseSignature = getContentSignature(page?.content ?? null);
      const baseUpdatedAt = page?.updatedAt;
      const recoveryEntry = isDurableContentEdit || isSettingsEdit
        ? recordRecoveryEntry({
            source: isLocal ? "local-file" : "internal-page",
            id,
            content: "content" in updates ? updates.content ?? null : page.content,
            ...(isLocal ? {
              settings: recoverySettings({ ...page, ...updates }),
              baseSettings: recoverySettings(page),
            } : {}),
            baseSignature,
            baseUpdatedAt,
            ...(page?.editorDraft ? { draftPage: {
              ...page,
              content: updates.content ?? page.content,
              ...(isLocal ? { localFilePath: undefined, localUnsaved: true } : {}),
            } } : {}),
          })
        : null;
      if (recoveryEntry) {
        clearRecoveryJournalNotice(id);
      } else if (isDurableContentEdit || isSettingsEdit) {
        showRecoveryJournalFailure(id, baseSignature, baseUpdatedAt, get, isLocal ? recoverySettings(page) : undefined);
      }
      const shouldMergeFrontmatterSettings =
        isSettingsEdit && !hasSidecarRoot;
      const shouldQueueLocalSettingsSave =
        isSettingsEdit && page?.localReadState !== "error" && !page?.editorDraft;

      if (shouldMergeFrontmatterSettings && page?.localReadState === "error") {
        toast.error(storeText("readSettingsUnchanged"));
        return;
      }
      let settingsRejected = false;
      set((state) => {
        const page = state.pages[id];
        if (!page) return state;
        const now = Date.now();

        let favoriteOrder = updates.favoriteOrder ?? page.favoriteOrder;
        if (
          updates.isFavorite === true &&
          !page.isFavorite &&
          favoriteOrder === undefined
        ) {
          const maxFavoriteOrder = Object.values(state.pages)
            .filter((p) => p.workspaceId === page.workspaceId && p.isFavorite)
            .reduce((max, p) => {
              const candidate = p.favoriteOrder ?? p.order ?? p.createdAt;
              return Math.max(max, candidate);
            }, -1);
          favoriteOrder = maxFavoriteOrder + 1;
        }

        let pinnedAt = updates.pinnedAt ?? page.pinnedAt;
        if (updates.isPinned === true) {
          pinnedAt = now;
        }
        if (updates.isPinned === false) {
          pinnedAt = undefined;
        }

        const isContentEdit = "content" in updates && !silent;
        let updatedPage = {
          ...page,
          ...updates,
          ...(favoriteOrder !== undefined ? { favoriteOrder } : {}),
          pinnedAt,
          updatedAt: isContentEdit ? now : page.updatedAt,
        };

        if (shouldMergeFrontmatterSettings) {
          const contentYamlBody = getContentFrontmatterBody(
            updatedPage.content,
          );
          const baseBlob =
            contentYamlBody !== null
              ? `---\n${contentYamlBody}\n---`
              : updatedPage.localFrontmatter;
          const mergeResult = mergeLocalPageSettingsIntoFrontmatter(baseBlob, {
            fontFamily: updatedPage.fontFamily ?? "default",
            pageLayout: updatedPage.pageLayout,
            isLocked: Boolean(updatedPage.isLocked),
            isPinned: Boolean(updatedPage.isPinned),
            isFavorite: Boolean(updatedPage.isFavorite),
          });
          if (!mergeResult.parseFailed) {
            const yamlBody = mergeResult.blob
              ? mergeResult.blob
                  .replace(/^---\r?\n/, "")
                  .replace(/\r?\n---$/, "")
              : null;
            updatedPage = {
              ...updatedPage,
              localFrontmatter: mergeResult.blob,
              content: applyFrontmatterBodyToContent(
                updatedPage.content,
                yamlBody,
              ),
            };
          } else {
            settingsRejected = true;
            return state;
          }
        }

        const shouldQueueContentSave =
          Boolean(updates.content) &&
          !silent &&
          isLocal &&
          page.localReadState !== "error" &&
          (!page.editorDraft || localPageHasPersistableContent(updates.content) ||
            state.dirtyLocalPageIds[id]) &&
          !(
            page.localUnsaved &&
            !localPageHasPersistableContent(updates.content) && !state.dirtyLocalPageIds[id]
          );

        if (shouldQueueContentSave || shouldQueueLocalSettingsSave) {
          const contentForSave = shouldQueueContentSave
            ? updates.content!
            : updatedPage.content;
          set((s) => ({
            dirtyLocalPageIds: { ...s.dirtyLocalPageIds, [id]: true },
          }));
          queueLocalPageSave(id, contentForSave, get, recoveryEntry?.revision);
        }

        return {
          pages: {
            ...state.pages,
            [id]: updatedPage,
          },
        };
      });

      if (settingsRejected) {
        toast.error(storeText("yamlSettingsUnchanged"), {
          description: storeText("fixYaml"),
        });
        return;
      }
      const updatedPage = get().pages[id];
      if (!updatedPage) return;

      if (isLocalFolderPage(updatedPage)) {
        if (shouldPersistLocalMeta && !updatedPage.localUnsaved) {
          persistPageSnapshot(updatedPage);
        }
        return;
      }

      if (updatedPage.editorDraft && !isDurableContentEdit) return;

      const persisted = persistPageSnapshot(
        updatedPage.editorDraft ? { ...updatedPage, editorDraft: undefined } : updatedPage,
      );
      if (persisted && updatedPage.editorDraft) {
        set((state) => ({ pages: {
          ...state.pages, [id]: { ...state.pages[id], editorDraft: undefined },
        } }));
      }
      if (persisted && recoveryEntry) {
        acknowledgeRecoveryEntry("internal-page", id, recoveryEntry.revision);
        clearRecoveryJournalNotice(id);
        clearPagePersistenceNotice(id);
      } else if (!persisted) {
        showPagePersistenceFailure(id, Boolean(recoveryEntry), get, set);
      } else {
        clearPagePersistenceNotice(id);
        clearRecoveryJournalNotice(id);
      }
    },
  };
}
