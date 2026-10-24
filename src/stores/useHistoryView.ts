import { create } from "zustand";

interface HistoryViewState {
  active: string | null;
  selectedVersionId: string | null;
  refreshTick: number;

  enter: (pageId: string) => void;
  exit: () => void;
  select: (versionId: string | null) => void;
  bumpRefresh: () => void;
}

export const useHistoryView = create<HistoryViewState>((set) => ({
  active: null,
  selectedVersionId: null,
  refreshTick: 0,

  enter: (pageId) =>
    set({ active: pageId, selectedVersionId: null, refreshTick: 0 }),
  exit: () => set({ active: null, selectedVersionId: null }),
  select: (versionId) => set({ selectedVersionId: versionId }),
  bumpRefresh: () => set((s) => ({ refreshTick: s.refreshTick + 1 })),
}));
