import { createTranslator as extraTranslator } from "@/i18n/core";
const extraText = extraTranslator(i18nYaml<"src/stores/pages/actions/hydrate.ts#block1:1">`
zh-Hans:
  recovered_other: "已恢复 {{count}} 篇未完成保存的笔记"
en:
  recovered_other: "Recovered {{count}} unsaved notes"
  recovered_one: "Recovered {{count}} unsaved note"
ja:
  recovered_other: "保存が完了していなかったノートを {{count}} 件復元しました"
`);
import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/actions/hydrate.ts#block2:2">`
zh-Hans:
  recoveredEditor: "内容已放回编辑区，请确认后继续编辑或保存。"
  recoveryKept: "发现未自动覆盖的恢复稿"
  newerStored: "主存储中有更新版本，恢复稿仍被保留。"
en:
  recoveredEditor: "The content is back in the editor. Review it before continuing to edit or save."
  recoveryKept: "A recovery draft was preserved separately"
  newerStored: "Storage contains a newer version. The recovery draft has been preserved."
ja:
  recoveredEditor: "内容をエディタに戻しました。確認のうえ、編集または保存を続けてください。"
  recoveryKept: "自動で上書きされていない復元データが見つかりました"
  newerStored: "メインストレージに新しいバージョンがあるため、復元データを保持しています。"
`);
import {
  loadPagesFromStorage,
  saveInternalPage,
} from "@/lib/storage/pageRepository";
import { getDbStorageItem, setDbStorageItem } from "@/lib/storage/localDbStorage";

import type { PagesState } from "../types";
import {
  LEGACY_TITLE_CHILDREN_REPAIR_MARK_KEY,
  NESTED_EMPTY_WRAPPER_REPAIR_MARK_KEY,
  HEADING_SECTION_FOLD_MIGRATION_MARK_KEY,
} from "../types";
import { isLocalFolderPage, seedLocalPageMetadataCache } from "../persistence";
import {
  acknowledgeRecoveryEntry,
  canApplyRecoveryEntry,
  listRecoveryEntries,
} from "@/lib/storage/recoveryJournal";
import { toast } from "@/components/ui/sonner";
import { getContentSignature } from "@/components/editor/utils/blocknote-content";
import { recoverEditorDraft } from "./recoverEditorDraft";
import {
  repairLegacyTitleChildrenInPages,
  repairNormalizedContentInPages,
  repairHeadingSectionFoldInPages,
} from "../migrations";

export type StoreSet = (
  fn: Partial<PagesState> | ((state: PagesState) => Partial<PagesState>),
) => void;
export type StoreGet = () => PagesState;

export const hydrateFromStorageAction = async (set: StoreSet) => {
  const { pages, localPageMetas, onboardingCompleted } =
    loadPagesFromStorage();
  const hasRepairedLegacyTitleChildren =
    getDbStorageItem(LEGACY_TITLE_CHILDREN_REPAIR_MARK_KEY) === "1";
  const { pages: repairedPages, repairedPageIds } = hasRepairedLegacyTitleChildren
    ? { pages, repairedPageIds: [] as string[] }
    : repairLegacyTitleChildrenInPages(pages);
  const hasRepairedNestedEmptyWrappers =
    getDbStorageItem(NESTED_EMPTY_WRAPPER_REPAIR_MARK_KEY) === "1";
  const {
    pages: contentRepairedPages,
    repairedPageIds: contentRepairedPageIds,
  } = hasRepairedNestedEmptyWrappers
    ? { pages: repairedPages, repairedPageIds: [] as string[] }
    : repairNormalizedContentInPages(repairedPages);
  const hasMigratedHeadingSectionFold =
    getDbStorageItem(HEADING_SECTION_FOLD_MIGRATION_MARK_KEY) === "1";
  const {
    pages: sectionFoldPages,
    repairedPageIds: sectionFoldPageIds,
  } = hasMigratedHeadingSectionFold
    ? { pages: contentRepairedPages, repairedPageIds: [] as string[] }
    : repairHeadingSectionFoldInPages(contentRepairedPages);

  if (!hasRepairedLegacyTitleChildren) {
    if (repairedPageIds.length > 0) {
      repairedPageIds.forEach((pageId) => {
        const repairedPage = contentRepairedPages[pageId];
        if (!repairedPage || repairedPage.localFilePath) return;
        saveInternalPage(repairedPage);
      });
      console.info(
        `[usePages] repaired legacy title-children structure in ${repairedPageIds.length} page(s).`,
      );
    }
    setDbStorageItem(LEGACY_TITLE_CHILDREN_REPAIR_MARK_KEY, "1");
  }

  if (!hasRepairedNestedEmptyWrappers) {
    if (contentRepairedPageIds.length > 0) {
      contentRepairedPageIds.forEach((pageId) => {
        const repairedPage = contentRepairedPages[pageId];
        if (!repairedPage || isLocalFolderPage(repairedPage)) return;
        saveInternalPage(repairedPage);
      });
      console.info(
        `[usePages] repaired nested empty wrapper content in ${contentRepairedPageIds.length} page(s).`,
      );
    }
    setDbStorageItem(NESTED_EMPTY_WRAPPER_REPAIR_MARK_KEY, "1");
  }

  if (!hasMigratedHeadingSectionFold) {
    if (sectionFoldPageIds.length > 0) {
      sectionFoldPageIds.forEach((pageId) => {
        const repairedPage = sectionFoldPages[pageId];
        if (!repairedPage || repairedPage.localFilePath) return;
        saveInternalPage(repairedPage);
      });
      console.info(
        `[usePages] migrated heading section fold in ${sectionFoldPageIds.length} page(s).`,
      );
    }
    setDbStorageItem(HEADING_SECTION_FOLD_MIGRATION_MARK_KEY, "1");
  }

  const recoveredPages = { ...sectionFoldPages };
  let recoveredCount = 0;
  let conflictCount = 0;
  for (const entry of listRecoveryEntries("internal-page")) {
    const current = recoveredPages[entry.id];
    if (!current) {
      const draft = recoverEditorDraft(entry);
      if (draft) {
        recoveredPages[entry.id] = draft;
        recoveredCount += 1;
      }
      continue;
    }
    const currentSignature = getContentSignature(current.content);
    if (
      currentSignature === getContentSignature(entry.content)
    ) {
      acknowledgeRecoveryEntry("internal-page", entry.id, entry.revision);
      continue;
    }
    if (!canApplyRecoveryEntry(entry, current.content, current.updatedAt, currentSignature)) {
      conflictCount += 1;
      continue;
    }
    recoveredPages[entry.id] = {
      ...current,
      content: entry.content ?? [],
      updatedAt: Math.max(current.updatedAt, entry.updatedAt),
    };
    recoveredCount += 1;
  }

  seedLocalPageMetadataCache(localPageMetas);
  set({
    pages: recoveredPages,
    activePageId: null,
    pendingNavigatePageId: null,
    expandPageId: null,
    searchHighlightQuery: null,
    searchHighlightPageId: null,
    searchHighlightNonce: 0,
    handledSearchHighlightNonce: 0,
    hydrated: true,
    lastSavedAt: null,
    onboardingCompleted,
  });
  if (recoveredCount > 0) {
    toast.warning(extraText("recovered", { count: recoveredCount }), {
      id: "goose-recovered-internal-pages",
      description: storeText("recoveredEditor"),
    });
  }
  if (conflictCount > 0) {
    toast.warning(storeText("recoveryKept"), {
      id: "goose-recovery-conflicts",
      description: storeText("newerStored"),
    });
  }
};
