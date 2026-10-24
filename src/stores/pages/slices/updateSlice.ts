import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/slices/updateSlice.ts#block1:1">`
zh-Hans:
  recoveryWriteFailed: "无法写入恢复备份"
  keepWindowOpen: "请先不要关闭窗口，并复制重要内容后重试。"
  readSettingsUnchanged: "页面读取失败，未更改设置"
  yamlSettingsUnchanged: "YAML 前置区格式异常，未更改设置"
  fixYaml: "原文已保留，请先修复 YAML 后重试。"
  notSaved: "内容暂未保存"
  recoverySaved: "最新内容已放入恢复备份，下次打开仍可找回。"
en:
  recoveryWriteFailed: "Couldn’t write the recovery backup"
  keepWindowOpen: "Keep this window open. Copy any important content, then try again."
  readSettingsUnchanged: "The page couldn’t be read. Settings were not changed."
  yamlSettingsUnchanged: "The YAML frontmatter is invalid. Settings were not changed."
  fixYaml: "The original content was preserved. Fix the YAML and try again."
  notSaved: "Content has not been saved"
  recoverySaved: "The latest content was saved to a recovery backup and can be recovered the next time you open the app."
ja:
  recoveryWriteFailed: "復元用バックアップを書き込めませんでした"
  keepWindowOpen: "ウインドウを閉じずに、重要な内容をコピーしてからもう一度お試しください。"
  readSettingsUnchanged: "ページを読み込めなかったため、設定は変更されていません"
  yamlSettingsUnchanged: "YAML フロントマターの形式が正しくないため、設定は変更されていません"
  fixYaml: "元の内容は保持されています。YAML を修正してからもう一度お試しください。"
  notSaved: "内容は未保存です"
  recoverySaved: "最新の内容を復元用バックアップに保存しました。次回起動時に復元できます。"
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
      const isDurableContentEdit =
        Boolean(page) && "content" in updates && !silent &&
        (!page?.editorDraft || localPageHasPersistableContent(updates.content) ||
          localPageHasPersistableContent(page.content));
      const recoveryEntry = isDurableContentEdit
        ? recordRecoveryEntry({
            source: isLocal ? "local-file" : "internal-page",
            id,
            content: updates.content ?? null,
            baseSignature: () => getContentSignature(page?.content ?? null),
            baseUpdatedAt: page?.updatedAt,
            ...(page?.editorDraft ? { draftPage: {
              ...page,
              content: updates.content ?? page.content,
              ...(isLocal ? { localFilePath: undefined, localUnsaved: true } : {}),
            } } : {}),
          })
        : null;
      if (isDurableContentEdit && !recoveryEntry) {
        toast.error(storeText("recoveryWriteFailed"), {
          id: "goose-recovery-journal-failed",
          description: storeText("keepWindowOpen"),
        });
      }
      const shouldMergeFrontmatterSettings =
        isLocal && !silent && isLocalPageFrontmatterSettingsUpdate(updates);
      const shouldQueueLocalSettingsSave =
        shouldMergeFrontmatterSettings && page?.localReadState !== "error" && !page?.editorDraft;

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
      } else if (!persisted) {
        toast.error(storeText("notSaved"), {
          id: `goose-page-save-failed:${id}`,
          description: storeText("recoverySaved"),
        });
      }
    },
  };
}
