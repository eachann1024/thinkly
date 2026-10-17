import { useEffect, useMemo, useReducer, useState } from "react";
import { describeDiskWriteError } from "@/lib/diskWriteError";
import { useHistoryView } from "@/stores/useHistoryView";
import { usePages } from "@/stores/usePages";
import { resolveHistoryBackend } from "@/lib/history/backend";
import { filterAdjacentDuplicateHistoryEntries } from "@/lib/history/dedupe";
import { materializeVersion } from "@/lib/history/restore";
import type { HistoryIndexEntry } from "@/lib/history/types";
import {
  extractBlockNoteTitle,
} from "@/components/editor/utils/blocknote-content";
import {
  createSafeHistoryContent,
  formatGroupLabel,
} from "../historyViewPresentation";

import { historyIndexReducer, historySelectionReducer } from "./historyRequestState";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/history/history-view/logic/useHistoryViewState.tsx#messages:1">`
zh-Hans:
  untitled: "无标题"
en:
  untitled: "Untitled"
`;
const t = createTranslator(messages);


export function useHistoryViewState() {
  const active = useHistoryView((s) => s.active);

  const selectedVersionId = useHistoryView((s) => s.selectedVersionId);

  const refreshTick = useHistoryView((s) => s.refreshTick);

  const exit = useHistoryView((s) => s.exit);

  const select = useHistoryView((s) => s.select);

  const bumpRefresh = useHistoryView((s) => s.bumpRefresh);

  const getPage = usePages((s) => s.getPage);

  const updatePage = usePages((s) => s.updatePage);

  const activePageId = usePages((s) => s.activePageId);

  const pageId = active === activePageId ? active : null;

  const page = usePages((s) => pageId ? s.pages[pageId] : undefined);

  const pageTitle = page ? extractBlockNoteTitle(page.content) || t("untitled") : "";

  const [indexState, dispatchIndex] = useReducer(historyIndexReducer, { status: "idle" });
  const [selectionState, dispatchSelection] = useReducer(historySelectionReducer, { status: "idle" });
  const index = "data" in indexState ? indexState.data : null;
  const indexError = indexState.status === "error" && indexState.pageId === pageId ? indexState.error : null;
  const visibleSelection = selectionState.status !== "idle" && selectionState.pageId === pageId &&
    selectionState.versionId === selectedVersionId ? selectionState : null;
  const selectedContent = visibleSelection?.status === "ready" ? visibleSelection.content : null;
  const selectedStatus = visibleSelection?.status ?? "idle";
  const applyMilestone = (targetPageId: string, versionId: string, value: boolean) =>
    dispatchIndex({ type: "milestone", pageId: targetPageId, versionId, value });

  const [isRestoring, setIsRestoring] = useState(false);

  const [pendingMilestoneVersionId, setPendingMilestoneVersionId] = useState<
    string | null
  >(null);

  // Provider 常驻；离开历史或切到另一笔记时不复用前一页的索引。
  const visibleIndex = index?.pageId === pageId ? index : null;

  // 加载版本索引
  useEffect(() => {
    if (!pageId) {
      dispatchIndex({ type: "reset" });
      return;
    }
    let cancelled = false;
    dispatchIndex({ type: "load", pageId });
    const backend = resolveHistoryBackend(pageId);
    backend
      .loadIndex(pageId)
      .then(async (idx) => {
        const versions = await filterAdjacentDuplicateHistoryEntries(
          pageId,
          idx.versions,
          backend,
        );
        if (!cancelled) dispatchIndex({ type: "loaded", data: { ...idx, versions } });
      })
      .catch((error) => {
        if (!cancelled) {
          dispatchIndex({ type: "failed", pageId, error: describeDiskWriteError(error) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pageId, refreshTick]);

  // 加载选中版本内容
  useEffect(() => {
    if (!pageId || !selectedVersionId) {
      dispatchSelection({ type: "reset" });
      return;
    }
    let cancelled = false;
    dispatchSelection({ type: "load", pageId, versionId: selectedVersionId });
    materializeVersion(pageId, selectedVersionId)
      .then((result) => {
        if (cancelled) return;
        if (!result || result.content == null) {
          dispatchSelection({ type: "missing", pageId, versionId: selectedVersionId });
          return;
        }
        const safeContent = createSafeHistoryContent(result.content);
        if (!safeContent) {
          dispatchSelection({ type: "failed", pageId, versionId: selectedVersionId });
          return;
        }
        dispatchSelection({ type: "loaded", pageId, versionId: selectedVersionId, content: safeContent });
      })
      .catch(() => {
        if (!cancelled) {
          dispatchSelection({ type: "failed", pageId, versionId: selectedVersionId });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pageId, selectedVersionId]);

  useEffect(() => {
    if (!visibleIndex || visibleIndex.versions.length === 0) return;
    if (selectedVersionId) {
      if (visibleIndex.versions.some((v) => v.versionId === selectedVersionId)) return;
    }
    const sorted = [...visibleIndex.versions].sort(
      (a, b) => b.createdAt - a.createdAt,
    );
    select(sorted[0].versionId);
  }, [visibleIndex, selectedVersionId, select]);

  useEffect(() => {
    if (pageId && !page) {
      exit();
    }
  }, [pageId, page, exit]);

  useEffect(() => {
    if (!pageId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        exit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pageId, exit]);

  const groups = useMemo(() => {
    if (!visibleIndex || visibleIndex.versions.length === 0) return [];
    const sorted = [...visibleIndex.versions].sort(
      (a, b) => b.createdAt - a.createdAt,
    );
    const now = Date.now();
    const result: { label: string; items: HistoryIndexEntry[] }[] = [];
    let currentLabel = "";
    for (const v of sorted) {
      const label = formatGroupLabel(v.createdAt, now);
      if (label !== currentLabel) {
        result.push({ label, items: [] });
        currentLabel = label;
      }
      result[result.length - 1].items.push(v);
    }
    return result;
  }, [visibleIndex]);

  const selectedEntry = useMemo(
    () =>
      visibleIndex?.versions.find((v) => v.versionId === selectedVersionId) ?? null,
    [visibleIndex, selectedVersionId],
  );
  return {
    active,
    selectedVersionId,
    refreshTick,
    exit,
    select,
    bumpRefresh,
    getPage,
    updatePage,
    pageId,
    page,
    pageTitle,
    index,
    applyMilestone,
    indexError,
    selectedContent,
    selectedStatus,
    isRestoring,
    setIsRestoring,
    pendingMilestoneVersionId,
    setPendingMilestoneVersionId,
    groups,
    selectedEntry,
  };
}
