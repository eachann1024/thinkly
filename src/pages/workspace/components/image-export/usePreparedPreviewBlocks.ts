import { useEffect, useState } from "react";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { cloneExportBlocks } from "@/lib/export/prepareExportBlocks";
import type { CardTheme } from "@/lib/imageExport";
import { renderMathBlocksAsImages } from "@/lib/imageExport/math";
import { renderMermaidBlocksAsImages } from "@/lib/imageExport/mermaid";
import { resolveImageUrls } from "@/lib/imageExport/remoteImageResolver";

/**
 * Runs the same image / mermaid / math passes as the real export so the
 * preview shows diagrams and formulas as pictures. Until they finish, the
 * raw blocks render as text so the card never sits empty.
 */
export function usePreparedPreviewBlocks(
  blocks: BlockNoteContent,
  theme: CardTheme | null,
  localFilePath?: string | null,
): BlockNoteContent {
  const [prepared, setPrepared] = useState<{ source: BlockNoteContent; blocks: BlockNoteContent } | null>(null);

  useEffect(() => {
    if (!theme || !Array.isArray(blocks) || blocks.length === 0) return;
    let cancelled = false;
    const cloned = cloneExportBlocks(blocks, { ensureFirstTitle: false });
    void (async () => {
      try {
        await resolveImageUrls(cloned, localFilePath);
        await renderMermaidBlocksAsImages(cloned, theme);
        await renderMathBlocksAsImages(cloned, theme);
      } catch (error) {
        console.warn("[image-export] preview preparation failed", error);
        return;
      }
      if (!cancelled) setPrepared({ source: blocks, blocks: cloned });
    })();
    return () => {
      cancelled = true;
    };
  }, [blocks, theme, localFilePath]);

  // On a theme switch keep the last rendered diagrams until the new ones land.
  return prepared && prepared.source === blocks ? prepared.blocks : blocks;
}
