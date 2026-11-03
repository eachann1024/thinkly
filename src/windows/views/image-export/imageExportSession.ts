import { create } from "zustand";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { IMAGE_EXPORT_DEFAULT_WIDTH, type ImageExportWidth } from "@/lib/imageExport/contentWidth";
import type { ImageExportWindowPayload, ImageExportWindowScope } from "@/lib/imageExport/imageExportWindow";
import { normalizeCardThemeId, type CardThemeId } from "@/lib/imageExport/themes";
import {
  DEFAULT_WATERMARK_CONFIG,
  normalizeWatermarkConfig,
  type WatermarkConfig,
} from "@/lib/imageExport/watermark";

export type ImageExportRun = (action: "copy" | "save") => void;

interface ImageExportSessionState {
  source: ImageExportWindowPayload | null;
  scope: ImageExportWindowScope;
  selectionTheme: CardThemeId | null;
  themeId: CardThemeId;
  watermark: WatermarkConfig;
  width: ImageExportWidth;
  busy: boolean;
  ratio: number | null;
  height: number | null;
  run: ImageExportRun | null;
  load: (source: ImageExportWindowPayload) => void;
  setScope: (scope: ImageExportWindowScope) => void;
  setSelectionTheme: (id: CardThemeId) => void;
  setThemeId: (id: CardThemeId) => void;
  setWatermark: (partial: Partial<WatermarkConfig>) => void;
  setWidth: (width: ImageExportWidth) => void;
  setBusy: (busy: boolean) => void;
  setMeasure: (height: number, ratio: number) => void;
  setRun: (run: ImageExportRun | null) => void;
}

export const useImageExportSession = create<ImageExportSessionState>((set) => ({
  source: null,
  scope: "page",
  selectionTheme: null,
  themeId: "notebook",
  watermark: DEFAULT_WATERMARK_CONFIG,
  width: IMAGE_EXPORT_DEFAULT_WIDTH,
  busy: false,
  ratio: null,
  height: null,
  run: null,
  load: (source) =>
    set({
      source,
      scope: source.scope,
      selectionTheme: null,
      themeId: normalizeCardThemeId(source.themeId),
      watermark: normalizeWatermarkConfig(source.watermark),
      width: source.width,
      busy: false,
      ratio: null,
      height: null,
    }),
  setScope: (scope) =>
    set((state) => ({
      scope,
      selectionTheme: scope === "selection" ? null : state.selectionTheme,
      ratio: null,
      height: null,
    })),
  setSelectionTheme: (selectionTheme) => set({ selectionTheme, ratio: null, height: null }),
  setThemeId: (themeId) => set({ themeId: normalizeCardThemeId(themeId), ratio: null, height: null }),
  setWatermark: (partial) =>
    set((state) => ({
      watermark: normalizeWatermarkConfig({ ...state.watermark, ...partial }),
      ratio: null,
      height: null,
    })),
  setWidth: (width) => set({ width, ratio: null, height: null }),
  setBusy: (busy) => set({ busy }),
  setMeasure: (height, ratio) => set({ height, ratio }),
  setRun: (run) => set({ run }),
}));

export function sessionBlocks(state: ImageExportSessionState): BlockNoteContent {
  if (!state.source) return [];
  return state.scope === "selection" ? state.source.selection : state.source.pageContent;
}

export function sessionActiveTheme(state: Pick<
  ImageExportSessionState,
  "scope" | "selectionTheme" | "themeId"
>): CardThemeId {
  return state.scope === "selection"
    ? (state.selectionTheme ?? "original")
    : normalizeCardThemeId(state.themeId);
}
