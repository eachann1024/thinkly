import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { RefreshCw } from "@/components/ui/icons";
import { useLocale, useMessages, i18nYaml, getFormatLocale } from "@/i18n";
import { buildRecoveryDraftPreview } from "@/lib/recoveryDrafts";
import { useAuxiliaryWindow } from "@/windows/AuxiliaryWindowContext";
import { StandaloneWindowShell } from "@/windows/shell/StandaloneWindowShell";
import { exportRecoveryDraft, openRecoveryTarget } from "./recoveryDraftActions";
import {
  recoveryDraftTitle,
  recoveryPageCanOpen,
  recoverySlotNumber,
  recoverySourceKey,
  recoveryEntryKey,
  type RecoveryDraftStatus,
} from "./recoveryDraftModel";
import { useRecoveryDrafts } from "./useRecoveryDrafts";

const messages = i18nYaml<"src/windows/views/recovery/RecoveryDraftsBody.tsx#messages:1">`
zh-Hans:
  title: 恢复稿
  pending: "{{count}} 份待处理"
  refresh: 刷新列表
  emptyList: 当前没有待处理的恢复稿。
  emptyBody: 没有需要恢复的内容，可以关闭这个窗口。
  export: 导出完整恢复稿
  open: 打开原笔记
  openSlot: 打开原速记槽
  sourceInternal: 笔记
  sourceLocal: 本地文件
  sourceQuicknote: 速记槽 {{value1}}
  revision: 版本 {{value1}} · {{value2}}
  noContent: 此恢复稿没有正文内容。
  exportStarted: 恢复稿下载已开始。
  exportFailed: 导出恢复稿失败。
  targetUnavailable: 原目标在此窗口不可用。
  stale: 恢复稿已变化，请刷新列表后重试。
  expired: 这份恢复稿已过期，请刷新列表。
  unavailable: 无法加载恢复稿列表，请刷新后重试。
  list: 恢复稿列表
en:
  title: Recovery drafts
  pending: "{{count}} pending"
  refresh: Refresh list
  emptyList: There are no pending recovery drafts.
  emptyBody: Nothing to recover. You can close this window.
  export: Export full recovery draft
  open: Open original note
  openSlot: Open original Quick Note slot
  sourceInternal: Note
  sourceLocal: Local file
  sourceQuicknote: Quick Note slot {{value1}}
  revision: Revision {{value1}} · {{value2}}
  noContent: This recovery draft has no content.
  exportStarted: Recovery draft download started.
  exportFailed: Couldn’t export the recovery draft.
  targetUnavailable: The original target is unavailable in this window.
  stale: This recovery draft changed. Refresh the list and try again.
  expired: This recovery draft has expired. Refresh the list.
  unavailable: Couldn’t load the recovery draft list. Refresh and try again.
  list: Recovery drafts
ja:
  title: 復元用下書き
  pending: "{{count}} 件が未処理"
  refresh: 一覧を更新
  emptyList: 保留中の復元用下書きはありません。
  emptyBody: 復元する内容はありません。このウィンドウを閉じてください。
  export: 復元用下書きを完全にエクスポート
  open: 元のノートを開く
  openSlot: 元のクイックノートスロットを開く
  sourceInternal: ノート
  sourceLocal: ローカルファイル
  sourceQuicknote: クイックノートスロット {{value1}}
  revision: リビジョン {{value1}} · {{value2}}
  noContent: この復元用下書きに本文はありません。
  exportStarted: 復元用下書きのダウンロードを開始しました。
  exportFailed: 復元用下書きをエクスポートできませんでした。
  targetUnavailable: このウィンドウでは元の保存先を利用できません。
  stale: 復元用下書きが変更されました。一覧を更新して再試行してください。
  expired: この復元用下書きは期限切れです。一覧を更新してください。
  unavailable: 復元用下書き一覧を読み込めませんでした。更新して再試行してください。
  list: 復元用下書き
`;

const statusCopy: Partial<Record<RecoveryDraftStatus, "stale" | "expired" | "unavailable">> = {
  stale: "stale",
  expired: "expired",
  unavailable: "unavailable",
};

export function RecoveryDraftsBody() {
  useLocale();
  const t = useMessages(messages);
  const windowState = useAuxiliaryWindow();
  const drafts = useRecoveryDrafts();
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
  const snapshot = drafts.snapshot;
  const selected = drafts.selected;
  const slot = selected?.source === "quicknote" ? recoverySlotNumber(selected.id) : null;
  const title = selected && snapshot ? recoveryDraftTitle(selected, snapshot, t("sourceQuicknote", { value1: slot ?? "" })) : "";
  const preview = useMemo(() => (selected ? buildRecoveryDraftPreview(selected.content) : ""), [selected]);
  const canOpen = selected?.source === "quicknote" ? slot != null : Boolean(selected && recoveryPageCanOpen(snapshot?.pages[selected.id]));
  const stamp = (updatedAt: number) => new Date(updatedAt).toLocaleString(getFormatLocale());
  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => (current === message ? "" : current)), 2400);
  };
  const entries = snapshot?.entries ?? [];
  const problem = statusCopy[drafts.status];

  return (
    <StandaloneWindowShell
      title={t("title")}
      context={entries.length > 0 ? t("pending", { count: entries.length }) : undefined}
      maximizable={windowState.resizable}
      inset={false}
      actions={
        <IconButton type="button" size="sm" tone="muted" aria-label={t("refresh")} title={t("refresh")} onClick={() => void drafts.refresh()}>
          <RefreshCw className="size-4" />
        </IconButton>
      }
    >
      <div className="flex min-h-0 flex-1 px-2 pb-2">
        <nav aria-label={t("list")} className="flex w-[280px] shrink-0 flex-col gap-0.5 overflow-y-auto rounded-l-lg border border-r-0 border-border bg-[var(--goose-sidebar-surface)] p-1.5">
          {entries.length === 0 ? <p className="px-2.5 py-4 text-[13px] text-muted-foreground">{t("emptyList")}</p> : entries.map((entry) => {
            const key = recoveryEntryKey(entry);
            const itemSlot = entry.source === "quicknote" ? recoverySlotNumber(entry.id) : null;
            const itemTitle = snapshot ? recoveryDraftTitle(entry, snapshot, t("sourceQuicknote", { value1: itemSlot ?? "" })) : entry.id;
            return (
              <button key={key} type="button" aria-pressed={key === (selected ? recoveryEntryKey(selected) : "")} onClick={() => drafts.setSelectedKey(key)}
                className="goose-list-row flex w-full flex-col items-start gap-[3px] rounded-lg px-2.5 py-2.5 text-left">
                <span className="w-full truncate text-[13px] font-medium">{itemTitle}</span>
                <span className="goose-tabular w-full truncate text-xs text-muted-foreground">
                  {t(recoverySourceKey(entry.source), entry.source === "quicknote" ? { value1: itemSlot ?? "" } : undefined)} · {stamp(entry.updatedAt)}
                </span>
              </button>
            );
          })}
        </nav>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-r-lg border border-border bg-card">
          {problem ? <div className="grid flex-1 place-items-center px-6 text-center text-[13px] text-muted-foreground">{t(problem)}</div> : null}
          {!problem && !selected ? <div className="grid flex-1 place-items-center px-6 text-center text-[13px] text-muted-foreground">{t("emptyBody")}</div> : null}
          {!problem && selected ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{title}</span>
                  <span className="goose-tabular text-xs text-muted-foreground">{t("revision", { value1: selected.revision, value2: stamp(selected.updatedAt) })}</span>
                </div>
                <Button type="button" size="sm" variant="outline" disabled={exporting} onClick={() => {
                  setExporting(true);
                  void exportRecoveryDraft(selected, () => drafts.verifyCurrent(selected), (kind) => {
                    flash(t(kind === "started" ? "exportStarted" : kind === "failed" ? "exportFailed" : "stale"));
                    if (kind !== "started") void drafts.refresh();
                  }).finally(() => setExporting(false));
                }}>{t("export")}</Button>
                {canOpen ? <Button type="button" size="sm" onClick={() => {
                  void drafts.verifyCurrent(selected).then((current) => {
                    if (!current || !snapshot) {
                      flash(t("stale"));
                      void drafts.refresh();
                      return;
                    }
                    void openRecoveryTarget(selected, snapshot, () => flash(t("targetUnavailable")));
                  });
                }}>{selected.source === "quicknote" ? t("openSlot") : t("open")}</Button> : null}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6 text-sm leading-6">
                {preview ? <p className="whitespace-pre-wrap">{preview}</p> : <p className="text-muted-foreground">{t("noContent")}</p>}
              </div>
            </>
          ) : null}
        </main>
      </div>
      {notice ? <div role="status" className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-foreground px-3 py-2 text-[13px] text-background">{notice}</div> : null}
    </StandaloneWindowShell>
  );
}
