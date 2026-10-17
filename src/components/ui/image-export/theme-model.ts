import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/components/ui/image-export/theme-model.ts#localMessages:1">`
zh-Hans:
  sampleFile: "2026-05-15-手动更新"
  sampleHeading: "手动更新流程"
  sampleEdition: "（raven / ERP 标准版）"
en:
  sampleFile: "2026-05-15-manual-update"
  sampleHeading: "Manual update process"
  sampleEdition: "(raven / ERP Standard)"
`;
const uiText = createTranslator(localMessages);
import { useEffect, useState } from "react";
import { type CardThemeId, type CardTheme, type WatermarkConfig } from "@/lib/imageExport";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import type { Page } from "@/types";

export interface ImageExportThemeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (themeId: CardThemeId, watermarkConfig: WatermarkConfig) => void;
  mode: "page" | "selection";
  page?: Pick<Page, "content" | "fontFamily" | "localFilePath"> | null;
  blocks?: BlockNoteContent;
}

const PINNED_FIRST: Record<"light" | "dark", string> = {
  light: "github-light",
  dark: "github-dark",
};

export const NOTEBOOK_CARD_BLOCKS: BlockNoteContent = [
  {
    type: "heading",
    props: { level: 1 },
    content: [{ type: "text", text: uiText("sampleFile"), styles: {} }],
  },
  {
    type: "paragraph",
    content: [
      { type: "text", text: uiText("sampleHeading"), styles: { bold: true } },
      { type: "text", text: uiText("sampleEdition"), styles: {} },
    ],
  },
  {
    type: "codeBlock",
    props: { language: "bash" },
    content: "cd /opt/jenkins && ./update.sh",
  },
];

export function orderThemesForGroup(themes: CardTheme[]): CardTheme[] {
  const pinId = themes.length > 0 ? PINNED_FIRST[themes[0].mode] : undefined;
  if (!pinId) return themes;
  const pinned = themes.find((t) => t.id === pinId);
  if (!pinned) return themes;
  return [pinned, ...themes.filter((t) => t.id !== pinId)];
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);
    onChange();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  return reduced;
}
