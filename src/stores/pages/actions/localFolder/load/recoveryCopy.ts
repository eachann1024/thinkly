import { createTranslator, i18nYaml } from "@/i18n/core";
import { getPageTitle } from "@/components/editor/utils/page-title";
import type { Page } from "@/types";
import type { StoreGet } from "../../hydrate";
import type { RecoveryJournalEntry } from "@/lib/storage/recoveryJournal";
import { getLocalRecoveryContentSignature } from "@/lib/storage/localRecoverySignature";
import { recoverySettingsMatch } from "@/lib/storage/localRecoverySettings";

const text = createTranslator(i18nYaml<"src/stores/pages/actions/localFolder/load/recoveryCopy.ts#block1:1">`
zh-Hans:
  copyTitle: "{{title}}（恢复副本 {{revision}}）"
en:
  copyTitle: "{{title}} (Recovered copy {{revision}})"
ja:
  copyTitle: "{{title}}（復元コピー {{revision}}）"
`);

// 原日志由调用者在副本完整写盘后确认。新建使用 createOnly，不覆盖原文件。
export async function saveRecoveryCopy(
  get: StoreGet,
  page: Page,
  entry: RecoveryJournalEntry,
): Promise<boolean> {
  if (!entry.content) return false;
  const signature = getLocalRecoveryContentSignature(entry.content);
  if (signature === null) return false;
  const id = await get().createLocalPageRecord({
    workspaceId: page.workspaceId,
    parentId: page.parentId,
    title: text("copyTitle", {
      title: getPageTitle(page).slice(0, 100),
      revision: `${entry.updatedAt}-${entry.revision}`,
    }),
    content: entry.content,
    settings: entry.settings,
  });
  const copy = id ? get().pages[id] : undefined;
  return Boolean(copy && !copy.editorDraft && copy.localFilePath &&
    !get().dirtyLocalPageIds[copy.id] &&
    getLocalRecoveryContentSignature(copy.content) === signature &&
    recoverySettingsMatch(copy, entry.settings));
}
