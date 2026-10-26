import { createTranslator as extraTranslator } from "@/i18n/core";
const extraText = extraTranslator(i18nYaml<"src/stores/pages/actions/localFolder/load/recovery.ts#block1:1">`
zh-Hans:
  recovered_other: "已找回 {{count}} 篇未写盘的本地笔记"
en:
  recovered_other: "Recovered {{count}} local notes that hadn’t been saved to disk"
  recovered_one: "Recovered {{count}} local note that hadn’t been saved to disk"
ja:
  recovered_other: "ディスクに書き込まれていなかったローカルノートを {{count}} 件復元しました"
`);
import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/actions/localFolder/load/recovery.ts#block2:2">`
zh-Hans:
  recoveredLocal: "内容已恢复至编辑器，请确认内容后按快捷键保存。"
  externalConflict: "检测到外部文件冲突"
  recoverySeparate: "恢复稿已独立保留，未直接覆盖磁盘上的较新版本。"
en:
  recoveredLocal: "The content is back in the editor. Review it, then use the save shortcut."
  externalConflict: "An external file conflict was detected"
  recoverySeparate: "The recovery draft was kept separately. The newer version on disk was not overwritten."
ja:
  recoveredLocal: "内容をエディタに復元しました。内容を確認してから、ショートカットで保存してください。"
  externalConflict: "外部ファイルの競合を検出しました"
  recoverySeparate: "復元データは別に保持されており、ディスク上のより新しい版は上書きされていません。"
`);
import type { StoreSet, StoreGet } from "../../hydrate";
import {
  listRecoveryEntries,
  acknowledgeRecoveryEntry,
  canApplyRecoveryEntry,
} from "@/lib/storage/recoveryJournal";
import { getLocalRecoveryContentSignature, normalizeLocalRecoveryBaseSignature } from "@/lib/storage/localRecoverySignature";
import { getPendingLocalSaveContent, isRecoveredLocalSaveConfirmationRequired, restorePendingLocalSave } from "../../../folderSync";
import { notifyRecoveryDrafts } from "@/lib/recoveryDraftNotice";
import { recoverEditorDraft } from "../../recoverEditorDraft";
import { recoverySettingsMatch, validRecoverySettings } from "@/lib/storage/localRecoverySettings";

export function recoverScannedLocalPages(
  set: StoreSet,
  get: StoreGet,
  notebookId: string,
) {
  let recoveredCount = 0;
  let conflictCount = 0;
  for (const entry of listRecoveryEntries("local-file")) {
    if (!validRecoverySettings(entry.settings) || !validRecoverySettings(entry.baseSettings)) {
      conflictCount += 1;
      continue;
    }
    const current = get().pages[entry.id];
    if (!current) {
      const draft = recoverEditorDraft(entry);
      if (draft?.workspaceId === notebookId && entry.content) {
        restorePendingLocalSave(entry.id, entry.content, entry.revision);
        set((state) => ({
          pages: { ...state.pages, [entry.id]: draft },
          dirtyLocalPageIds: { ...state.dirtyLocalPageIds, [entry.id]: true },
        }));
        recoveredCount += 1;
      }
      continue;
    }
    if (!current || current.workspaceId !== notebookId || current.isFolder)
      continue;
    if (current.localReadState === "error") {
      conflictCount += 1;
      continue;
    }
    const currentSignature = getLocalRecoveryContentSignature(current.content);
    if (currentSignature !== null && currentSignature === getLocalRecoveryContentSignature(entry.content) && recoverySettingsMatch(current, entry.settings)) {
      if (!current.editorDraft && !get().dirtyLocalPageIds[entry.id] && getPendingLocalSaveContent(entry.id) === undefined && !isRecoveredLocalSaveConfirmationRequired(entry.id)) {
        acknowledgeRecoveryEntry("local-file", entry.id, entry.revision);
      }
      continue;
    }
    const baseSignature = entry.baseSignature
      ? normalizeLocalRecoveryBaseSignature(entry.baseSignature)
      : undefined;
    if (
      !recoverySettingsMatch(current, entry.baseSettings) ||
      currentSignature === null || baseSignature === null || !canApplyRecoveryEntry(
        { ...entry, baseSignature },
        current.content,
        undefined,
        currentSignature,
      )
    ) {
      conflictCount += 1;
      continue;
    }
    if (entry.content) {
      restorePendingLocalSave(entry.id, entry.content, entry.revision);
      set((state) => ({
        pages: {
          ...state.pages,
          [entry.id]: { ...state.pages[entry.id], ...entry.settings, content: entry.content! },
        },
        dirtyLocalPageIds: {
          ...state.dirtyLocalPageIds,
          [entry.id]: true,
        },
      }));
      recoveredCount += 1;
    }
  }
  if (recoveredCount > 0) {
    notifyRecoveryDrafts(extraText("recovered", { count: recoveredCount }), storeText("recoveredLocal"), `goose-recovered-local-pages:${notebookId}`);
  }
  if (conflictCount > 0) {
    notifyRecoveryDrafts(storeText("externalConflict"), storeText("recoverySeparate"), `goose-local-recovery-conflicts:${notebookId}`);
  }
}
