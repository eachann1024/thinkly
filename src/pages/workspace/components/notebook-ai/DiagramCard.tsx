import { useLocale } from "@/i18n";
import { useCallback, useEffect, useReducer, type RefObject } from "react";
import type { EditorRef } from "@/components/editor/core/Editor";
import { renderMermaidSvgForExport } from "@/lib/imageExport/mermaid";
import { svgMarkupToPngBlob } from "@/lib/imageExport/svgToPng";
import { ArtifactActions } from "./ArtifactActions";
import { ArtifactPanZoom } from "./ArtifactPanZoom";
import { createMermaidArtifactBlocks, insertArtifactBlocks } from "./insertArtifact";
import { useSettings } from "@/stores/useSettings";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";

import { diagramRenderReducer } from "./diagramRenderState";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/DiagramCard.tsx#messages:1">`
zh-Hans:
  theDiagramIsNotReadyYet: "图形尚未就绪"
  diagram: "图形"
  diagramGenerationFailed: "图形生成失败"
  generatingDiagram: "正在生成图形"
en:
  theDiagramIsNotReadyYet: "The diagram is not ready yet"
  diagram: "Diagram"
  diagramGenerationFailed: "Diagram generation failed"
  generatingDiagram: "Generating diagram"
ja:
  theDiagramIsNotReadyYet: "図はまだ準備できていません"
  diagram: "図"
  diagramGenerationFailed: "図の生成に失敗しました"
  generatingDiagram: "図を生成中"
`;
const t = createTranslator(messages);


interface DiagramCardProps {
  title?: string;
  source: string;
  editorRef?: RefObject<EditorRef | null>;
}

export function DiagramCard({ title, source, editorRef }: DiagramCardProps) {
  useLocale();
  const theme = useSettings((state) => state.theme);
  const resolvedTheme = useResolvedTheme(theme);
  const [renderState, dispatch] = useReducer(diagramRenderReducer, { status: "empty" });
  const key = `${resolvedTheme}:${source}`;
  const svg = renderState.status === "ready" && renderState.key === key ? renderState.svg : "";
  const failed = renderState.status === "failed" && renderState.key === key;

  useEffect(() => {
    let active = true;

    const render = async () => {
      dispatch({ type: "render", key });
      try {
        const nextSvg = await renderMermaidSvgForExport(source, resolvedTheme);
        if (active) dispatch({ type: "ready", key, svg: nextSvg });
      } catch {
        if (active) {
          dispatch({ type: "failed", key });
        }
      }
    };

    if (source.trim()) void render();
    else dispatch({ type: "clear" });
    return () => {
      active = false;
    };
  }, [resolvedTheme, source, key]);

  const capturePng = useCallback(async () => {
    const markup =
      svg ||
      (await renderMermaidSvgForExport(source, resolvedTheme));
    if (!markup.trim()) throw new Error(t("theDiagramIsNotReadyYet"));
    return svgMarkupToPngBlob(markup);
  }, [resolvedTheme, source, svg]);

  return (
    <div className="notebook-ai-canvas-card my-2 overflow-hidden">
      <div className="notebook-ai-canvas-card-header">
        <div className="notebook-ai-canvas-card-title">{title?.trim() || t("diagram")}</div>
        <ArtifactActions
          previewIdentity={key}
          copySource={source}
          onCopyImage={async () => capturePng()}
          onDownloadImage={capturePng}
          downloadImageFilename="diagram.png"
          onPreview={async () => {
            const markup =
              svg ||
              (await renderMermaidSvgForExport(source, resolvedTheme));
            if (!markup.trim()) throw new Error(t("theDiagramIsNotReadyYet"));
            return {
              kind: "svg",
              markup,
              fileName: "diagram.svg",
              background: resolvedTheme === "dark" ? "#1F1E1C" : "#ffffff",
            };
          }}
          onInsert={() =>
            insertArtifactBlocks(
              editorRef,
              createMermaidArtifactBlocks(title, source),
            )
          }
        />
      </div>
      {svg ? (
        <ArtifactPanZoom contentKey={`${resolvedTheme}:${source}`} minHeight={280}>
          <div
            aria-hidden="true"
            className="notebook-ai-artifact-svg"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </ArtifactPanZoom>
      ) : failed ? (
        <div className="flex min-h-[180px] items-center justify-center px-3 py-4 text-xs text-muted-foreground">
          {t("diagramGenerationFailed")}
        </div>
      ) : (
        <div className="flex min-h-[180px] items-center justify-center px-3 py-4 text-xs text-muted-foreground">
          {t("generatingDiagram")}
        </div>
      )}
    </div>
  );
}
