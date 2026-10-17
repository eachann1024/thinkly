import { createTranslator as extraTranslator } from "@/i18n/core";
const extraText = extraTranslator(i18nYaml<"src/stores/pages/actions/localFolder/load/recovery.ts#block1:1">`
zh-Hans:
  recovered_other: "已找回 {{count}} 篇未写盘的本地笔记"
en:
  recovered_other: "Recovered {{count}} local notes that hadn’t been saved to disk"
  recovered_one: "Recovered {{count}} local note that hadn’t been saved to disk"
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
`);
import type { StoreSet, StoreGet } from "../../hydrate";
import {
  listRecoveryEntries,
  acknowledgeRecoveryEntry,
  canApplyRecoveryEntry,
} from "@/lib/storage/recoveryJournal";
import { getContentSignature } from "@/components/editor/utils/blocknote-content";
import { restorePendingLocalSave } from "../../../folderSync";
import { toast } from "@/components/ui/sonner";
import { recoverEditorDraft } from "../../recoverEditorDraft";

export function recoverScannedLocalPages(
  set: StoreSet,
  get: StoreGet,
  notebookId: string,
) {
  let recoveredCount = 0;
  let conflictCount = 0;
  for (const entry of listRecoveryEntries("local-file")) {
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
    const currentSignature = getContentSignature(current.content);
    if (currentSignature === getContentSignature(entry.content)) {
      if (!current.editorDraft) acknowledgeRecoveryEntry("local-file", entry.id, entry.revision);
      continue;
    }
    if (
      !canApplyRecoveryEntry(
        entry,
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
          [entry.id]: { ...state.pages[entry.id], content: entry.content! },
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
    toast.warning(extraText("recovered", { count: recoveredCount }), {
      id: `goose-recovered-local-pages:${notebookId}`,
      description: storeText("recoveredLocal"),
    });
  }
  if (conflictCount > 0) {
    toast.warning(storeText("externalConflict"), {
      id: `goose-local-recovery-conflicts:${notebookId}`,
      description: storeText("recoverySeparate"),
    });
  }
}
