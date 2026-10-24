import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/components/ui/image-export/ThemePreviewCard.tsx#localMessages:1">`
zh-Hans:
  sampleFile: "2026-05-15-手动更新"
  sampleTitle: "设计即生活"
  sampleBody: "好的排版让阅读成为一种享受，每个细节都藏着设计师的用心。"
en:
  sampleFile: "2026-05-15-manual-update"
  sampleTitle: "Design is life"
  sampleBody: "Thoughtful typography makes reading a pleasure. Every detail reflects the care behind the design."
ja:
  sampleFile: "2026-05-15-手動アップデート"
  sampleTitle: "デザインは暮らしの一部"
  sampleBody: "優れたタイポグラフィは読むことを楽しみに変え、細部のひとつひとつにデザイナーの想いが宿ります。"
`;
const uiText = createTranslator(localMessages);

const MINI_DECORATION_SCALE = 0.3;
import * as GooseIcons from "@/components/ui/icons";
import { useMemo } from "react";
import { type CardTheme, type WatermarkConfig } from "@/lib/imageExport";
import { buildImageExportPreviewHtml } from "@/lib/imageExport/livePreview";
import { buildDecorationStyles } from "@/lib/imageExport/serializer/styles/decorations";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { cn } from "@/lib/utils";
import { PreviewFrame } from "./PreviewFrame";

export function ThemePreviewCard({
  theme,
  selected,
  onClick,
  reducedMotion,
  sampleBlocks,
  watermarkConfig,
}: {
  theme: CardTheme;
  selected: boolean;
  onClick: () => void;
  reducedMotion: boolean;
  sampleBlocks?: BlockNoteContent;
  watermarkConfig?: WatermarkConfig;
}) {
  const locale = useLocale();
  const previewTitle = uiText("sampleTitle");
  const previewBody = uiText("sampleBody");
  const notebookPreview = theme.id === "notebook";
  const sampleHtml = useMemo(() => {
    if (!notebookPreview || !sampleBlocks) return null;
    return buildImageExportPreviewHtml({
      title: uiText("sampleFile"),
      blocks: sampleBlocks,
      theme,
      mode: "page",
      watermarkConfig,
    });
  }, [notebookPreview, sampleBlocks, theme, watermarkConfig, locale]);
  const miniClass = `gs-mini-${theme.id}`;
  const deco = useMemo(
    () =>
      buildDecorationStyles(
        theme,
        {
          container: `.${miniClass}`,
          card: `.${miniClass} .gs-mini-card`,
          header: `.${miniClass} .gs-mini-header`,
          title: `.${miniClass} .gs-mini-title`,
          content: `.${miniClass} .gs-mini-body`,
          watermark: `.${miniClass} .gs-mini-footer`,
          date: `.${miniClass} .gs-mini-footer`,
        },
        MINI_DECORATION_SCALE,
      ),
    [miniClass, theme],
  );

  const cardStyle: React.CSSProperties = {
    background: sampleHtml ? theme.background : deco.containerBackground,
    borderRadius: 10,
    padding: 14,
    position: "relative",
    overflow: "hidden",
    transition: reducedMotion
      ? "box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1)"
      : "transform 200ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1)",
    boxShadow: selected
      ? "0 0 0 1px var(--goose-interactive-selected-border), 0 10px 22px rgba(15,23,42,0.12)"
      : "0 1px 2px rgba(15,23,42,0.04), inset 0 0 0 1px rgba(15,23,42,0.06)",
    minHeight: 152,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  };

  const innerCardStyle: React.CSSProperties = {
    background: deco.cardBackground,
    position: "relative",
    borderRadius: Math.max(theme.cardRadius * 0.35, 4),
    padding: `${Math.max(theme.cardPaddingY * 0.28, 10)}px ${Math.max(theme.cardPaddingX * 0.28, 12)}px`,
    border: theme.cardBorder === "none" ? "none" : "1px solid rgba(0,0,0,0.06)",
    boxShadow: theme.cardShadow.includes("none")
      ? "none"
      : "0 1px 4px rgba(0,0,0,0.04)",
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: theme.titleFont.split(",")[0].replace(/['"]/g, ""),
    fontSize: Math.max(theme.titleFontSize * 0.35, 11),
    fontWeight: theme.titleFontWeight,
    lineHeight: 1.3,
    letterSpacing: theme.titleLetterSpacing,
    color: theme.textColor,
    textAlign: theme.titleAlign,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const bodyStyle: React.CSSProperties = {
    fontFamily: theme.bodyFont.split(",")[0].replace(/['"]/g, ""),
    fontSize: Math.max(theme.bodyFontSize * 0.35, 9),
    lineHeight: 1.5,
    color: theme.secondaryText,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    letterSpacing: theme.bodyLetterSpacing,
  };

  return (
    <button
      type="button"
      data-goose-control="theme-preview-card"
      aria-pressed={selected}
      aria-label={theme.name}
      onClick={onClick}
      className="group flex flex-col gap-2.5 text-left"
    >
      {!sampleHtml && deco.css ? <style>{deco.css}</style> : null}
      <div
        style={cardStyle}
        className={cn(
          miniClass,
          "cursor-pointer",
          !reducedMotion && "group-hover:-translate-y-0.5",
        )}
      >
        {sampleHtml ? (
          <div className="relative h-[124px] overflow-hidden rounded-[6px]">
            <PreviewFrame
              title={theme.name}
              html={sampleHtml}
              className="pointer-events-none origin-top-left border-0"
              style={{ width: 680, height: 560, transform: "scale(0.22)" }}
            />
          </div>
        ) : (
          <div className="gs-mini-card" style={innerCardStyle}>
            <div className="gs-mini-header" style={{ marginBottom: 4 }}>
              <div className="gs-mini-title" style={titleStyle}>{previewTitle}</div>
            </div>
            <div className="gs-mini-body" style={bodyStyle}>{previewBody}</div>
          </div>
        )}
        {selected && (
          <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-control border border-[var(--goose-interactive-selected-border)] bg-[var(--goose-interactive-selected)] shadow-[0_2px_6px_rgba(15,23,42,0.18)]">
            <GooseIcons.Check
              className="h-3 w-3 text-[var(--goose-accent-text)]"
              strokeWidth={3}
            />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2 px-0.5">
        <span
          className={`text-[12px] font-medium leading-tight ${selected ? "text-foreground" : "text-foreground"}`}
        >
          {theme.name}
        </span>
        <span className="text-[11px] text-muted-foreground leading-tight tracking-wide">
          {theme.nameEn}
        </span>
      </div>
    </button>
  );
}
