import { create } from "zustand";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { IMAGE_EXPORT_DEFAULT_WIDTH } from "@/lib/imageExport/contentWidth";
import { normalizeCardThemeId, type CardThemeId } from "@/lib/imageExport/themes";
import { useHistoryView } from "./useHistoryView";

export type ImageExportScope = "page" | "selection";
export type ImageExportAction = "copy" | "save";

interface ImageExportViewState {
  active: string | null;
  scope: ImageExportScope;
  blocks: BlockNoteContent;
  selectionTheme: CardThemeId | null;
  busy: boolean;
  ratio: number | null;
  height: number | null;
  width: number;
  run: ((action: ImageExportAction) => void) | null;
  enter: (pageId: string, scope: ImageExportScope, blocks: BlockNoteContent) => void;
  exit: () => void;
  setScope: (scope: ImageExportScope) => void;
  setSelectionTheme: (id: CardThemeId) => void;
  setBusy: (busy: boolean) => void;
  setMeasure: (height: number, ratio: number) => void;
  setWidth: (width: number) => void;
  setRun: (run: ((action: ImageExportAction) => void) | null) => void;
}

export function activeImageExportThemeId(
  scope: ImageExportScope,
  selectionTheme: CardThemeId | null,
  pageTheme: CardThemeId,
): CardThemeId {
  return scope === "selection" ? (selectionTheme ?? "original") : normalizeCardThemeId(pageTheme);
}

export const useImageExportView = create<ImageExportViewState>((set) => ({
  active: null,
  scope: "page",
  blocks: [],
  selectionTheme: null,
  busy: false,
  ratio: null,
  height: null,
  width: IMAGE_EXPORT_DEFAULT_WIDTH,
  run: null,
  enter: (pageId, scope, blocks) => {
    useHistoryView.getState().exit();
    set({
      active: pageId,
      scope,
      blocks,
      selectionTheme: null,
      busy: false,
      ratio: null,
      height: null,
    });
  },
  exit: () =>
    set({
      active: null,
      scope: "page",
      blocks: [],
      selectionTheme: null,
      busy: false,
      ratio: null,
      height: null,
      run: null,
    }),
  setScope: (scope) =>
    set((state) => ({
      scope,
      selectionTheme: scope === "selection" ? null : state.selectionTheme,
      ratio: null,
      height: null,
    })),
  setSelectionTheme: (selectionTheme) => set({ selectionTheme, ratio: null, height: null }),
  setBusy: (busy) => set({ busy }),
  setMeasure: (height, ratio) => set({ height, ratio }),
  setWidth: (width) => set({ width, ratio: null, height: null }),
  setRun: (run) => set({ run }),
}));
