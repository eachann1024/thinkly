import { createTranslator, i18nYaml } from "@/i18n/core";
const text = createTranslator(i18nYaml<"src/stores/pages/saveFailureNotices.ts#block1:1">`
zh-Hans:
  recoveryWriteFailed: "无法写入恢复备份"
  keepWindowOpen: "请先不要关闭窗口，并复制重要内容后重试。"
  notSaved: "内容暂未保存"
  recoverySaved: "最新内容已放入恢复备份，下次打开仍可找回。"
  retry: "重试"
  pageUnavailable: "笔记已删除或不可用，请先恢复笔记后重试。"
  saveIncomplete: "页面保存尚未完成：{{id}}"
en:
  recoveryWriteFailed: "Couldn’t write the recovery backup"
  keepWindowOpen: "Keep this window open. Copy any important content, then try again."
  notSaved: "Content has not been saved"
  recoverySaved: "The latest content was saved to a recovery backup and can be recovered the next time you open the app."
  retry: "Retry"
  pageUnavailable: "This note was deleted or is unavailable. Restore it before retrying."
  saveIncomplete: "The page has not finished saving: {{id}}"
ja:
  recoveryWriteFailed: "復元用バックアップを書き込めませんでした"
  keepWindowOpen: "ウインドウを閉じずに、重要な内容をコピーしてからもう一度お試しください。"
  notSaved: "内容は未保存です"
  recoverySaved: "最新の内容を復元用バックアップに保存しました。次回起動時に復元できます。"
  retry: "再試行"
  pageUnavailable: "ノートが削除されたか利用できません。復元してから再試行してください。"
  saveIncomplete: "ページの保存が完了していません：{{id}}"
`);
import type { StoreGet } from "./actions/hydrate";
import type { PagesState } from "./types";
import { describeDiskWriteError } from "@/lib/diskWriteError";
import {
  dismissSaveRecoveryNotice,
  showSaveRecoveryNotice,
} from "@/lib/save-recovery-notice";
import {
  recordRecoveryEntry,
  getRecoveryEntry,
  acknowledgeRecoveryEntry,
} from "@/lib/storage/recoveryJournal";
import { isLocalFolderPage } from "./persistence";
import { isRecoveredLocalSaveConfirmationRequired, queueLocalPageSave } from "./folderSync";
import { persistPageSnapshot } from "./persistence";
import type { NoteSettings } from "@/lib/note-metadata/contract";
import { recoverySettings } from "@/lib/storage/localRecoverySettings";

export const recoveryJournalNoticeId = (pageId: string) =>
  `goose-recovery-journal-failed:${pageId}`;
export const pagePersistenceNoticeId = (pageId: string) =>
  `goose-page-save-failed:${pageId}`;

export function clearRecoveryJournalNotice(pageId: string): void {
  dismissSaveRecoveryNotice(recoveryJournalNoticeId(pageId));
}

export function clearPagePersistenceNotice(pageId: string): void {
  dismissSaveRecoveryNotice(pagePersistenceNoticeId(pageId));
}

export function showRecoveryJournalFailure(
  pageId: string,
  baseSignature: string,
  baseUpdatedAt: number | undefined,
  get: StoreGet,
  baseSettings?: NoteSettings,
): void {
  showSaveRecoveryNotice({
    id: recoveryJournalNoticeId(pageId),
    title: text("recoveryWriteFailed"),
    description: text("keepWindowOpen"),
    retryLabel: text("retry"),
    onRetry: () => {
      const latest = get().pages[pageId];
      if (!latest || latest.trashedAt) throw new Error(text("pageUnavailable"));
      const local = isLocalFolderPage(latest);
      const entry = recordRecoveryEntry({
        source: local ? "local-file" : "internal-page",
        id: pageId,
        content: latest.content,
        baseSignature,
        baseUpdatedAt,
        ...(local ? { settings: recoverySettings(latest), baseSettings } : {}),
        ...(latest.editorDraft ? { draftPage: {
          ...latest,
          ...(local ? { localFilePath: undefined, localUnsaved: true } : {}),
        } } : {}),
      });
      if (!entry) throw new Error(text("recoveryWriteFailed"));
      if (local && get().dirtyLocalPageIds[pageId]) {
        queueLocalPageSave(pageId, latest.content, get, entry.revision);
      }
    },
    onRetryFailure: describeDiskWriteError,
  });
}

export function showPagePersistenceFailure(
  pageId: string,
  recoverySaved: boolean,
  get: () => PagesState,
  set: import("zustand").StoreApi<PagesState>["setState"],
): void {
  showSaveRecoveryNotice({
    id: pagePersistenceNoticeId(pageId),
    title: text("notSaved"),
    description: recoverySaved ? text("recoverySaved") : text("keepWindowOpen"),
    retryLabel: text("retry"),
    onRetry: async () => {
      const latest = get().pages[pageId];
      if (!latest || latest.trashedAt) throw new Error(text("pageUnavailable"));
      if (isLocalFolderPage(latest)) {
        if (isRecoveredLocalSaveConfirmationRequired(pageId)) {
          throw new Error(text("saveIncomplete", { id: pageId }));
        }
        await get().flushPendingLocalSaveByPageId(pageId);
        if (isRecoveredLocalSaveConfirmationRequired(pageId) || get().dirtyLocalPageIds[pageId]) {
          throw new Error(text("saveIncomplete", { id: pageId }));
        }
      } else {
        const snapshot = latest.editorDraft
          ? { ...latest, editorDraft: undefined }
          : latest;
        if (!persistPageSnapshot(snapshot)) throw new Error(text("notSaved"));
        if (latest.editorDraft && get().pages[pageId] === latest) {
          set((state) => ({ pages: {
            ...state.pages, [pageId]: { ...latest, editorDraft: undefined },
          } }));
        }
        const journal = getRecoveryEntry("internal-page", pageId);
        if (journal) acknowledgeRecoveryEntry("internal-page", pageId, journal.revision);
      }
      clearRecoveryJournalNotice(pageId);
    },
    onRetryFailure: describeDiskWriteError,
  });
}
