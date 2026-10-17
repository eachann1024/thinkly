import { Image } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { useCallback, useMemo, type RefObject } from "react";
import type { EditorRef } from "@/components/editor/core/Editor";
import { sanitizeSvgMarkup } from "@/lib/notebook-ai/svgSanitizer";
import { svgMarkupToPngBlob } from "@/lib/imageExport/svgToPng";
import { useSettings } from "@/stores/useSettings";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { ArtifactActions } from "./ArtifactActions";
import { ArtifactPanZoom } from "./ArtifactPanZoom";
import { createSvgArtifactBlocks, insertArtifactBlocks } from "./insertArtifact";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/SvgArtifactCard.tsx#messages:1">`
zh-Hans:
  image: "图片"
  generatingImage: "图片生成中"
  generatingImage2: "正在生成图片"
  couldNotDisplayImage: "图片无法显示"
en:
  image: "Image"
  generatingImage: "Generating image"
  generatingImage2: "Generating image"
  couldNotDisplayImage: "Could not display image"
`;
const t = createTranslator(messages);


interface SvgArtifactCardProps {
  title?: string;
  svg: string;
  editorRef?: RefObject<EditorRef | null>;
}

const EXPORT_PADDING = 48;
const EXPORT_PAPER_LIGHT = "#FFFEFA";
const EXPORT_PAPER_DARK = "#1F1E1C";

function canvasFilename(title?: string) {
  const base =
    title
      ?.trim()
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 40) || t("image");
  return `${base}.png`;
}

export function CanvasLoadingCard({ title }: { title?: string }) {
  return (
    <div
      className="notebook-ai-canvas-card my-2"
      aria-busy="true"
      aria-label={title?.trim() || t("generatingImage")}
    >
      <div className="notebook-ai-canvas-card-loading">
        <EmptyState icon={Image} title={t("generatingImage2")} />
      </div>
    </div>
  );
}

export function SvgArtifactCard({ title, svg, editorRef }: SvgArtifactCardProps) {
  const theme = useSettings((state) => state.theme);
  const resolvedTheme = useResolvedTheme(theme);
  const isDark = resolvedTheme === "dark";
  const sanitizedSvg = useMemo(() => sanitizeSvgMarkup(svg), [svg]);
  const filename = canvasFilename(title);

  const capturePng = useCallback(async () => {
    if (!sanitizedSvg.trim()) throw new Error(t("couldNotDisplayImage"));
    return svgMarkupToPngBlob(sanitizedSvg, {
      padding: EXPORT_PADDING,
      backgroundColor: isDark ? EXPORT_PAPER_DARK : EXPORT_PAPER_LIGHT,
    });
  }, [isDark, sanitizedSvg]);

  return (
    <div className="notebook-ai-canvas-card my-2 overflow-hidden">
      <div className="notebook-ai-canvas-card-header">
        <div className="notebook-ai-canvas-card-title">{title?.trim() || t("image")}</div>
        {sanitizedSvg ? (
          <ArtifactActions
            previewIdentity={JSON.stringify([sanitizedSvg, isDark, filename])}
            copySource={sanitizedSvg}
            onCopyImage={async () => capturePng()}
            onDownloadImage={capturePng}
            downloadImageFilename={filename}
            onPreview={async () => {
              if (!sanitizedSvg.trim()) throw new Error(t("couldNotDisplayImage"));
              return {
                kind: "svg",
                markup: sanitizedSvg,
                fileName: filename.replace(/\.png$/i, ".svg"),
                background: isDark ? EXPORT_PAPER_DARK : EXPORT_PAPER_LIGHT,
              };
            }}
            onInsert={() =>
              insertArtifactBlocks(
                editorRef,
                createSvgArtifactBlocks(title, sanitizedSvg),
              )
            }
          />
        ) : null}
      </div>
      {sanitizedSvg ? (
        <ArtifactPanZoom contentKey={sanitizedSvg} minHeight={280}>
          <div
            role="img"
            aria-label={title?.trim() || t("image")}
            className="notebook-ai-artifact-svg"
            // Model SVG is allowlisted by sanitizeSvgMarkup before rendering.
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
          />
        </ArtifactPanZoom>
      ) : (
        <div className="flex min-h-[180px] items-center justify-center px-3 py-4 text-xs text-muted-foreground">
          <EmptyState icon={Image} title={t("couldNotDisplayImage")} />
        </div>
      )}
    </div>
  );
}
