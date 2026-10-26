import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/i18n";
import { i18nYaml, useMessages } from "@/i18n";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { listRecoveryEntries, getRecoveryEntry, type RecoveryJournalEntry, type RecoverySource } from "@/lib/storage/recoveryJournal";
import { buildRecoveryDraftExport, buildRecoveryDraftPreview, recoveryDraftIsCurrent, recoveryDraftsPage, RECOVERY_LIST_PAGE_SIZE } from "@/lib/recoveryDrafts";
import { usePages } from "@/stores/usePages";
import { useTabs } from "@/stores/useTabs";
import { useQuickNote } from "@/stores/useQuickNote";
import { normalizeSlot } from "@/stores/quicknote/normalization";
import { getPageTitle } from "@/components/editor/utils/page-title";

const messages = i18nYaml<"src/components/recovery/RecoveryDraftsDialog.tsx#messages:1">`
zh-Hans:
  title: 恢复稿
  empty: 当前没有待处理的恢复稿。
  refresh: 刷新列表
  previous: 上一页
  next: 下一页
  export: 导出完整恢复稿
  open: 打开原笔记
  openSlot: 打开原速记槽
  targetUnavailable: 原目标在此窗口不可用。
  stale: 恢复稿已变化，请刷新列表后重试。
  sourceInternal: 笔记
  sourceLocal: 本地文件
  sourceQuicknote: 速记槽 {{value1}}
  revision: 版本 {{value1}} · {{value2}}
  noContent: 此恢复稿没有正文内容。
  exportFailed: 导出恢复稿失败。
  exportStarted: 恢复稿下载已开始。
  done: 完成
en:
  title: Recovery drafts
  empty: There are no pending recovery drafts.
  refresh: Refresh list
  previous: Previous
  next: Next
  export: Export full recovery draft
  open: Open original note
  openSlot: Open original Quick Note slot
  targetUnavailable: The original target is unavailable in this window.
  stale: This recovery draft changed. Refresh the list and try again.
  sourceInternal: Note
  sourceLocal: Local file
  sourceQuicknote: Quick Note slot {{value1}}
  revision: Revision {{value1}} · {{value2}}
  noContent: This recovery draft has no content.
  exportFailed: Couldn’t export the recovery draft.
  exportStarted: Recovery draft download started.
  done: Done
ja:
  title: 復元用下書き
  empty: 保留中の復元用下書きはありません。
  refresh: 一覧を更新
  previous: 前へ
  next: 次へ
  export: 復元用下書きを完全にエクスポート
  open: 元のノートを開く
  openSlot: 元のクイックノートスロットを開く
  targetUnavailable: このウィンドウでは元の保存先を利用できません。
  stale: 復元用下書きが変更されました。一覧を更新して再試行してください。
  sourceInternal: ノート
  sourceLocal: ローカルファイル
  sourceQuicknote: クイックノートスロット {{value1}}
  revision: リビジョン {{value1}} · {{value2}}
  noContent: この復元用下書きに本文はありません。
  exportFailed: 復元用下書きをエクスポートできませんでした。
  exportStarted: 復元用下書きのダウンロードを開始しました。
  done: 完了
`;

type Props = { open: boolean; onOpenChange: (open: boolean) => void };
const sourceKey = (source: RecoverySource) => source === "internal-page" ? "sourceInternal" : "sourceLocal";
const entryKey = (entry: RecoveryJournalEntry) => `${entry.source}:${entry.id}:${entry.revision}`;
const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString();

function downloadInBrowser(filename: string, json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RecoveryDraftsDialog({ open, onOpenChange }: Props) {
  useLocale();
  const t = useMessages(messages);
  const [entries, setEntries] = useState<RecoveryJournalEntry[]>([]);
  const [listPage, setListPage] = useState(0);
  const [selectedKey, setSelectedKey] = useState("");
  const [exportingKey, setExportingKey] = useState("");
  const [pendingPageId, setPendingPageId] = useState<string | null>(null);
  const activePageId = usePages((state) => state.activePageId);
  const refresh = useCallback(() => {
    const next = listRecoveryEntries().sort((a, b) => b.updatedAt - a.updatedAt);
    setEntries(next);
    setListPage(0);
    setSelectedKey(next[0] ? entryKey(next[0]) : "");
  }, []);
  useEffect(() => { if (open) refresh(); }, [open, refresh]);
  useEffect(() => {
    if (pendingPageId && activePageId === pendingPageId) {
      setPendingPageId(null);
      onOpenChange(false);
    }
  }, [activePageId, onOpenChange, pendingPageId]);

  const selected = useMemo(() => entries.find((entry) => entryKey(entry) === selectedKey) ?? null, [entries, selectedKey]);
  const verifyCurrent = (entry: RecoveryJournalEntry) => {
    if (recoveryDraftIsCurrent(entry, getRecoveryEntry(entry.source, entry.id))) return true;
    toast.warning(t("stale"));
    refresh();
    return false;
  };

  const exportEntry = async (entry: RecoveryJournalEntry) => {
    if (exportingKey || !verifyCurrent(entry)) return;
    setExportingKey(entryKey(entry));
    try {
      const file = buildRecoveryDraftExport(entry);
      const blob = new Blob([file.json], { type: "application/json;charset=utf-8" });
      const desktop = window.gooseDesktop;
      if (typeof desktop?.saveToDownloads === "function") {
        const { saveBlobAndReveal } = await import("@/lib/export/fileSave");
        if (!recoveryDraftIsCurrent(entry, getRecoveryEntry(entry.source, entry.id))) return toast.warning(t("stale"));
        if (!await saveBlobAndReveal(blob, file.filename)) throw new Error(t("exportFailed"));
      } else {
        if (!recoveryDraftIsCurrent(entry, getRecoveryEntry(entry.source, entry.id))) return toast.warning(t("stale"));
        downloadInBrowser(file.filename, file.json);
      }
      toast.success(t("exportStarted"));
    } catch (error) {
      console.error("[recovery-drafts] export failed", error);
      toast.error(t("exportFailed"));
    } finally {
      setExportingKey("");
    }
  };

  const openTarget = (entry: RecoveryJournalEntry) => {
    if (!verifyCurrent(entry)) return;
    if (entry.source === "quicknote") {
      const slot = Number(entry.id);
      if (!document.querySelector("[data-quicknote-root]") || !Number.isInteger(slot) || slot < 1 || slot > 5) {
        toast.warning(t("targetUnavailable"));
        return;
      }
      useQuickNote.getState().setActiveSlot(normalizeSlot(entry.id));
      onOpenChange(false);
      return;
    }
    const page = usePages.getState().pages[entry.id];
    if (!page || page.isFolder || page.trashedAt || !document.querySelector("[data-workspace-root]")) {
      toast.warning(t("targetUnavailable"));
      return;
    }
    setPendingPageId(page.id);
    useTabs.getState().openPermanentTab(page.id, { reuseEmpty: false });
  };

  const slot = selected?.source === "quicknote" ? normalizeSlot(selected.id) : null;
  const selectedPage = selected ? usePages.getState().pages[selected.id] : null;
  const title = selected?.source === "quicknote"
    ? useQuickNote.getState().slotNames[slot!] || t("sourceQuicknote", { value1: slot! })
    : selectedPage ? getPageTitle(selectedPage) : selected?.draftPage ? getPageTitle(selected.draftPage) : selected?.id ?? "";
  const canOpen = selected?.source === "quicknote"
    ? Boolean(Number.isInteger(Number(selected.id)) && Number(selected.id) >= 1 && Number(selected.id) <= 5 && document.querySelector("[data-quicknote-root]"))
    : Boolean(selectedPage && !selectedPage.isFolder && !selectedPage.trashedAt && document.querySelector("[data-workspace-root]"));
  const preview = useMemo(() => selected ? buildRecoveryDraftPreview(selected.content) : "", [selected]);
  const visibleEntries = recoveryDraftsPage(entries, listPage);
  const changeListPage = (nextPage: number) => {
    setListPage(nextPage);
    const first = recoveryDraftsPage(entries, nextPage)[0];
    setSelectedKey(first ? entryKey(first) : "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(80vh,720px)] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12"><DialogTitle>{t("title")}</DialogTitle></DialogHeader>
        <div className="grid min-h-0 max-h-[60vh] grid-cols-[minmax(150px,0.8fr)_minmax(0,1.5fr)] overflow-hidden">
          <div className="min-h-0 space-y-1 overflow-y-auto border-r border-border p-2">
            {entries.length === 0 ? <p className="px-2 py-3 text-sm text-muted-foreground">{t("empty")}</p> : visibleEntries.map((entry) => {
              const itemTitle = entry.source === "quicknote"
                ? useQuickNote.getState().slotNames[normalizeSlot(entry.id)] || t("sourceQuicknote", { value1: normalizeSlot(entry.id) })
                : (() => { const page = entry.draftPage ?? usePages.getState().pages[entry.id]; return page ? getPageTitle(page) : entry.id; })();
              const key = entryKey(entry);
              return <Button variant="ghost" contentStyle="preserve" key={key} type="button" onClick={() => setSelectedKey(key)} aria-pressed={key === selectedKey}
                className="goose-list-row goose-accent-selection w-full rounded-md px-2 py-2 text-left text-sm">
                <span className="block truncate font-medium">{itemTitle}</span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">{entry.source === "quicknote" ? t("sourceQuicknote", { value1: normalizeSlot(entry.id) }) : t(sourceKey(entry.source))} · {formatDate(entry.updatedAt)}</span>
              </Button>;
            })}
            {entries.length > RECOVERY_LIST_PAGE_SIZE && <div className="flex justify-between gap-2 pt-2">
              <Button size="sm" variant="ghost" disabled={listPage === 0} onClick={() => changeListPage(listPage - 1)}>{t("previous")}</Button>
              <Button size="sm" variant="ghost" disabled={(listPage + 1) * RECOVERY_LIST_PAGE_SIZE >= entries.length} onClick={() => changeListPage(listPage + 1)}>{t("next")}</Button>
            </div>}
          </div>
          <div className="min-h-0 overflow-y-auto p-4">
            {selected && <>
              <h3 className="truncate text-sm font-medium">{title}</h3>
              <div className="mt-3 min-h-24 whitespace-pre-wrap break-words rounded-md bg-[hsl(var(--goose-shell-bg))] p-3 text-sm leading-5">
                {preview || t("noContent")}
                {selected.content && preview.length >= 3500 ? "…" : ""}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {canOpen && <Button size="sm" variant="outline" onClick={() => openTarget(selected)}>{selected.source === "quicknote" ? t("openSlot") : t("open")}</Button>}
                <Button size="sm" onClick={() => void exportEntry(selected)} disabled={Boolean(exportingKey)}>{t("export")}</Button>
              </div>
            </>}
          </div>
        </div>
        <DialogFooter className="border-t border-border px-4 py-3">
          <Button variant="outline" onClick={refresh}>{t("refresh")}</Button>
          <DialogClose>{t("done")}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
