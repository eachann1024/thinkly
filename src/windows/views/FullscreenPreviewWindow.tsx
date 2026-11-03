import { useLocale, i18nYaml, createTranslator } from "@/i18n";
import { parseFullscreenPreviewPayload } from "@/lib/preview/fullscreenPreviewWindow";
import { useAuxiliaryWindow } from "@/windows/AuxiliaryWindowContext";
import { StandaloneWindowShell } from "@/windows/shell/StandaloneWindowShell";
import { PreviewBody } from "./preview/PreviewBody";
import { PreviewZoomControls } from "./preview/PreviewZoomControls";
import { usePreviewStage } from "./preview/usePreviewStage";

const messages = i18nYaml<"src/windows/views/FullscreenPreviewWindow.tsx#messages:1">`
zh-Hans:
  preview: "预览"
  unavailable: "无法显示这份预览。"
en:
  preview: "Preview"
  unavailable: "This preview can’t be shown."
ja:
  preview: "プレビュー"
  unavailable: "このプレビューは表示できません。"
`;
const t = createTranslator(messages);

export function FullscreenPreviewWindow() {
  useLocale();
  const { payload, resizable } = useAuxiliaryWindow();
  const content = parseFullscreenPreviewPayload(payload);
  const title = content?.title ?? t("preview");
  const stage = usePreviewStage(previewIdentity(content), content?.kind !== "html");

  return (
    <StandaloneWindowShell
      title={title}
      context={content?.context}
      inset={false}
      maximizable={resizable}
      actions={
        content ? (
          <PreviewZoomControls
            percent={stage.stage.percent}
            onZoomOut={() => stage.zoomBy(-1)}
            onZoomIn={() => stage.zoomBy(1)}
            onFit={stage.fit}
          />
        ) : null
      }
    >
      {content ? (
        <PreviewBody
          payload={content}
          stage={stage.stage}
          viewportRef={stage.viewportRef}
          contentRef={stage.contentRef}
          onPointerDown={stage.onPointerDown}
        />
      ) : (
        <p className="p-6 text-sm text-muted-foreground">{t("unavailable")}</p>
      )}
    </StandaloneWindowShell>
  );
}

function previewIdentity(content: ReturnType<typeof parseFullscreenPreviewPayload>): string {
  if (!content) return "";
  if (content.kind === "image") return content.dataUrl.slice(0, 64);
  if (content.kind === "svg") return content.markup.slice(0, 64);
  if (content.kind === "html") return content.html.slice(0, 64);
  if (content.kind === "math") return content.source;
  return JSON.stringify([content.chartType, content.categories, content.series, content.isDark]);
}
