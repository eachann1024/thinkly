import { createTranslator, i18nYaml } from "@/i18n/core";
import type { StoreSet, StoreGet } from "../../hydrate";
import {
  listRecoveryEntries,
  acknowledgeRecoveryEntry,
  canApplyRecoveryEntry,
  getRecoveryEntry,
} from "@/lib/storage/recoveryJournal";
import { getLocalRecoveryContentSignature, normalizeLocalRecoveryBaseSignature } from "@/lib/storage/localRecoverySignature";
import { cloneJSONContent, getPendingLocalSaveContent, queueLocalPageSave } from "../../../folderSync";
import { notifyRecoveryDrafts } from "@/lib/recoveryDraftNotice";
import { recoverEditorDraft } from "../../recoverEditorDraft";
import { prepareRecoveredLocalDraft } from "../../recoverLocalDraft";
import { recoverySettingsMatch, validRecoverySettings } from "@/lib/storage/localRecoverySettings";
import { saveRecoveryCopy } from "./recoveryCopy";

const text = createTranslator(i18nYaml<"src/stores/pages/actions/localFolder/load/recovery.ts#block1:1">`
zh-Hans:
  failed: "部分笔记暂时无法自动恢复"
  retained: "恢复备份仍已保留。请检查磁盘权限或可用空间后重试。"
en:
  failed: "Some notes could not be recovered automatically"
  retained: "Recovery backups are still preserved. Check disk permissions or available space, then retry."
ja:
  failed: "一部のノートを自動復元できませんでした"
  retained: "復元用バックアップは保持されています。ディスクの権限や空き容量を確認してから再試行してください。"
`);

export async function recoverScannedLocalPages(
  set: StoreSet,
  get: StoreGet,
  notebookId: string,
): Promise<void> {
  let failedCount = 0;
  for (const entry of listRecoveryEntries("local-file")) {
    const current = get().pages[entry.id];
    const draft = !current ? recoverEditorDraft(entry) : null;
    const target = current ?? draft;
    if (!target || target.workspaceId !== notebookId || target.isFolder || target.trashedAt) continue;
    // 重扫不能用旧恢复快照覆盖正在编辑或正在写入的内容。
    if (current && (get().dirtyLocalPageIds[entry.id] || getPendingLocalSaveContent(entry.id) !== undefined)) continue;
    if (!entry.content || !validRecoverySettings(entry.settings) || !validRecoverySettings(entry.baseSettings)) {
      failedCount += 1;
      continue;
    }
    try {
      if (getRecoveryEntry("local-file", entry.id)?.revision !== entry.revision) continue;
      const currentSignature = getLocalRecoveryContentSignature(target.content);
      const recoveredSignature = getLocalRecoveryContentSignature(entry.content);
      const alreadySaved = !target.editorDraft && target.localReadState !== "error" &&
        currentSignature !== null && currentSignature === recoveredSignature &&
        recoverySettingsMatch(target, entry.settings);
      if (alreadySaved) {
        if (!acknowledgeRecoveryEntry("local-file", entry.id, entry.revision)) failedCount += 1;
        continue;
      }
      const baseSignature = entry.baseSignature
        ? normalizeLocalRecoveryBaseSignature(entry.baseSignature) : null;
      const canRestore = target.editorDraft || target.localReadState !== "error" &&
        baseSignature !== null && currentSignature !== null &&
        recoverySettingsMatch(target, entry.baseSettings) && canApplyRecoveryEntry(
          { ...entry, baseSignature }, target.content, undefined, currentSignature,
        );
      if (!canRestore) {
        // 基线不同或无法确认：先把恢复版保存为独立笔记，原文件保持原样。
        if (!await saveRecoveryCopy(get, target, entry) ||
            !acknowledgeRecoveryEntry("local-file", entry.id, entry.revision)) failedCount += 1;
        continue;
      }
      const content = cloneJSONContent(entry.content);
      const restored = target.editorDraft ? prepareRecoveredLocalDraft(target, get().pages) : target;
      set((state) => ({
        pages: { ...state.pages, [entry.id]: { ...restored, ...entry.settings, content } },
        dirtyLocalPageIds: { ...state.dirtyLocalPageIds, [entry.id]: true },
      }));
      queueLocalPageSave(entry.id, content, get, entry.revision);
      // 沿用普通保存的磁盘冲突校验，写盘成功后才确认日志。
      await get().flushPendingLocalSaveByPageId(entry.id);
    } catch (error) {
      failedCount += 1;
      console.error("[local-recovery] automatic recovery failed", entry.id, error);
    }
  }
  if (failedCount > 0) {
    notifyRecoveryDrafts(text("failed"), text("retained"), `goose-local-recovery-failed:${notebookId}`);
  }
}
