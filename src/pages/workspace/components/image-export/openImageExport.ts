import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import {
  buildImageExportWindowPayload,
  openImageExportWindow,
} from "@/lib/imageExport/imageExportWindow";
import { flushEditorContent } from "@/stores/pages/actions/flushEditor";
import { usePages } from "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";

export function openImageExport(pageId: string, blocks: BlockNoteContent) {
  try {
    flushEditorContent(true);
  } catch {
    // The stored page content is still a valid snapshot when the flush misses.
  }
  const page = usePages.getState().pages[pageId];
  if (!page) return;
  const settings = useSettings.getState();
  const isDark = document.documentElement.classList.contains("dark");
  const fontSize = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--editor-font-size"),
  );
  const payload = buildImageExportWindowPayload({
    page,
    selection: blocks,
    themeId: settings.imageExportThemeId,
    watermark: settings.imageExportWatermark,
    isDark,
    editorFontSize: Number.isFinite(fontSize) ? fontSize : settings.editorFontSize,
  });
  void openImageExportWindow(payload);
}
