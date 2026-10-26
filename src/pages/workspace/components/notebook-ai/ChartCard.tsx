import { useLocale } from "@/i18n";
import { useThemeSurfaceSnapshot } from "@/lib/themeSurfaceSnapshot";
import { useCallback, useMemo, useRef, type RefObject } from "react";
import { useSettings } from "@/stores/useSettings";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import type { EditorRef } from "@/components/editor/core/Editor";
import {
  buildOption,
  hasRenderableChartSeries,
  type SimplifiedConfig,
  type ChartType,
} from "@/agent/renderers/echarts/chartTheme";
import { getPalette } from "@/agent/renderers/echarts/chartPalette";
import { calculateContentAwarePixelRatio, svgMarkupToPngBlob } from "@/lib/imageExport/svgToPng";
import { useChartRenderer } from "./useChartRenderer";
import { ArtifactRenderStatus } from "./ArtifactRenderStatus";
import { ArtifactActions } from "./ArtifactActions";
import {
  createImageArtifactBlocks,
  insertArtifactBlocks,
} from "./insertArtifact";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ChartCard.tsx#messages:1">`
zh-Hans:
  chartExportFailed: "图表导出失败"
  chartExportIsEmpty: "图表导出为空"
  imageEncodingFailed: "图片编码失败"
  chartDataIsIncomplete: "图表数据不完整"
  theChartIsNotReadyYet: "图表尚未就绪"
  chart: "图表"
en:
  chartExportFailed: "Chart export failed"
  chartExportIsEmpty: "Chart export is empty"
  imageEncodingFailed: "Image encoding failed"
  chartDataIsIncomplete: "Chart data is incomplete"
  theChartIsNotReadyYet: "The chart is not ready yet"
  chart: "Chart"
ja:
  chartExportFailed: "グラフの書き出しに失敗しました"
  chartExportIsEmpty: "グラフの書き出し結果が空です"
  imageEncodingFailed: "画像のエンコードに失敗しました"
  chartDataIsIncomplete: "グラフのデータが不完全です"
  theChartIsNotReadyYet: "グラフの準備ができていません"
  chart: "グラフ"
`;
const t = createTranslator(messages);


interface ChartSeries {
  name: string;
  data: number[];
}

interface ChartCardProps {
  type: "bar" | "line" | "pie";
  title?: string;
  categories?: string[];
  series: ChartSeries[];
  editorRef?: RefObject<EditorRef | null>;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error(t("chartExportFailed"));
  const blob = await response.blob();
  if (!blob.size) throw new Error(t("chartExportIsEmpty"));
  return blob;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error(t("imageEncodingFailed")));
    };
    reader.onerror = () => reject(new Error(t("imageEncodingFailed")));
    reader.readAsDataURL(blob);
  });
}

export function ChartIncompleteNotice({ title }: { title?: string }) {
  useLocale();
  return (
    <div className="notebook-ai-canvas-card my-2 overflow-hidden">
      {title ? (
        <div className="notebook-ai-canvas-card-header">
          <div className="notebook-ai-canvas-card-title">{title}</div>
        </div>
      ) : null}
      <div className="px-3.5 py-6 text-sm text-muted-foreground">
        {t("chartDataIsIncomplete")}
      </div>
    </div>
  );
}

export function ChartCard(props: ChartCardProps) {
  useLocale();
  const themeSurface = useThemeSurfaceSnapshot();
  const theme = useSettings((state) => state.theme);
  const resolvedTheme = useResolvedTheme(theme);
  const isDark = resolvedTheme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const hasSeries = hasRenderableChartSeries(props.series);

  const option = useMemo(() => {
    if (!hasRenderableChartSeries(props.series)) return null;
    const cfg: SimplifiedConfig = {
      type: props.type as ChartType,
      categories: props.categories,
      series: props.series,
    };
    return {
      color: getPalette(isDark),
      ...buildOption(cfg, isDark, 1),
    };
  }, [props.type, props.categories, props.series, isDark, themeSurface]);

  const { chart: chartRef, status, retry } = useChartRenderer(containerRef, option);

  const capturePngBlob = useCallback(async () => {
    const chart = chartRef.current;
    if (!chart) throw new Error(t("theChartIsNotReadyYet"));
    const width = Math.max(1, chart.getWidth?.() || containerRef.current?.clientWidth || 1);
    const height = Math.max(
      1,
      chart.getHeight?.() || containerRef.current?.clientHeight || 1,
    );
    const pixelRatio = calculateContentAwarePixelRatio(width, height);
    const dataUrl = chart.getDataURL({
      type: "png",
      pixelRatio,
      backgroundColor: "transparent",
    });
    // ECharts' SVG renderer returns SVG even when getDataURL requests PNG.
    // Serialize the rendered DOM so quoted font names stay valid XML.
    chart.getZr().flush();
    const svg = containerRef.current?.querySelector("svg");
    return svg
      ? svgMarkupToPngBlob(new XMLSerializer().serializeToString(svg), { pixelRatio, padding: 0 })
      : dataUrlToBlob(dataUrl);
  }, []);

  const capturePngDataUrl = useCallback(async () => blobToDataUrl(await capturePngBlob()), [capturePngBlob]);

  if (!hasSeries) {
    return <ChartIncompleteNotice title={props.title} />;
  }

  return (
    <div className="notebook-ai-canvas-card notebook-ai-chart-card my-2 overflow-hidden" aria-busy={status === "loading"}>
      <div className="notebook-ai-canvas-card-header">
        <div className="notebook-ai-canvas-card-title">{props.title?.trim() || t("chart")}</div>
        <ArtifactActions
          imageReady={status === "ready"}
          insertReady={status === "ready"}
          previewIdentity={JSON.stringify([props.type, props.categories, props.series, resolvedTheme, themeSurface])}
          onCopyImage={capturePngDataUrl}
          onDownloadImage={capturePngBlob}
          downloadImageFilename="chart.png"
          onPreviewImage={capturePngDataUrl}
          previewFilename="chart.png"
          onInsert={async () => {
            const dataUrl = await blobToDataUrl(await capturePngBlob());
            return insertArtifactBlocks(
              props.editorRef,
              createImageArtifactBlocks(props.title, dataUrl, t("chart")),
            );
          }}
        />
      </div>
      {status !== "ready" ? <ArtifactRenderStatus failed={status === "failed"} onRetry={retry} /> : null}
      <div
        ref={containerRef}
        className="notebook-ai-chart-card-canvas"
        style={{ width: "100%", height: props.type === "pie" ? 260 : 240, opacity: status === "ready" ? 1 : 0 }}
        role="img"
        aria-label={props.title ?? t("chart")}
      />
    </div>
  );
}
