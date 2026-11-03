import type { PreviewContent } from "./previewAction";

export type FullscreenPreviewKind = "image" | "svg" | "html" | "math" | "chart";

export type FullscreenPreviewPayload =
  | {
      kind: "image";
      dataUrl: string;
      title: string;
      context?: string;
      background?: string;
    }
  | {
      kind: "svg";
      markup: string;
      title: string;
      context?: string;
      background?: string;
    }
  | {
      kind: "html";
      html: string;
      title: string;
      context?: string;
      background?: string;
      foreground?: string;
      border?: string;
    }
  | {
      kind: "math";
      source: string;
      title: string;
      context?: string;
    }
  | {
      kind: "chart";
      chartType: "bar" | "line" | "pie";
      categories?: string[];
      series: { name: string; data: number[] }[];
      title: string;
      context?: string;
      isDark: boolean;
    };

const KINDS: readonly FullscreenPreviewKind[] = ["image", "svg", "html", "math", "chart"];

export function parseFullscreenPreviewPayload(value: unknown): FullscreenPreviewPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.kind !== "string" || !KINDS.includes(raw.kind as FullscreenPreviewKind)) return null;
  if (typeof raw.title !== "string" || !raw.title.trim()) return null;
  const context = typeof raw.context === "string" && raw.context.trim() ? raw.context : undefined;
  const title = raw.title;
  if (raw.kind === "image" && typeof raw.dataUrl === "string" && raw.dataUrl.startsWith("data:")) {
    return { kind: "image", dataUrl: raw.dataUrl, title, context, background: optionalString(raw.background) };
  }
  if (raw.kind === "svg" && typeof raw.markup === "string" && raw.markup.trim()) {
    return { kind: "svg", markup: raw.markup, title, context, background: optionalString(raw.background) };
  }
  if (raw.kind === "html" && typeof raw.html === "string" && raw.html.trim()) {
    return {
      kind: "html",
      html: raw.html,
      title,
      context,
      background: optionalString(raw.background),
      foreground: optionalString(raw.foreground),
      border: optionalString(raw.border),
    };
  }
  if (raw.kind === "math" && typeof raw.source === "string" && raw.source.trim()) {
    return { kind: "math", source: raw.source, title, context };
  }
  if (raw.kind === "chart" && isChartType(raw.chartType) && Array.isArray(raw.series)) {
    const series = raw.series.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>;
      if (typeof item.name !== "string" || !Array.isArray(item.data)) return [];
      const data = item.data.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      return [{ name: item.name, data }];
    });
    if (series.length === 0) return null;
    const categories = Array.isArray(raw.categories)
      ? raw.categories.filter((value): value is string => typeof value === "string")
      : undefined;
    return {
      kind: "chart",
      chartType: raw.chartType,
      categories,
      series,
      title,
      context,
      isDark: raw.isDark === true,
    };
  }
  return null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isChartType(value: unknown): value is "bar" | "line" | "pie" {
  return value === "bar" || value === "line" || value === "pie";
}

export async function openFullscreenPreview(content: PreviewContent, title: string, context?: string): Promise<void> {
  const payload = await serializePreviewContent(content, title, context);
  if (payload) await openFullscreenPreviewWindow(payload);
}

export async function openFullscreenPreviewWindow(payload: FullscreenPreviewPayload): Promise<void> {
  await window.gooseDesktop?.auxiliary?.open({ kind: "fullscreen-preview", payload });
}

async function serializePreviewContent(
  content: PreviewContent,
  title: string,
  context?: string,
): Promise<FullscreenPreviewPayload | null> {
  const label = title.trim() || content.fileName?.trim() || "";
  if (!label) return null;
  if (content.kind === "image") {
    const { toImageDataUrl } = await import("./previewAction");
    return { kind: "image", dataUrl: await toImageDataUrl(content.data), title: label, context };
  }
  if (content.kind === "svg") {
    return { kind: "svg", markup: content.markup, title: label, context, background: content.background };
  }
  if (content.kind === "math") {
    return { kind: "math", source: content.source, title: label, context };
  }
  const { readThemeSurfaceSnapshot } = await import("@/lib/themeSurfaceSnapshot");
  const theme = readThemeSurfaceSnapshot();
  return {
    kind: "html",
    html: content.html,
    title: label,
    context,
    background: theme.background,
    foreground: theme.foreground,
    border: theme.border,
  };
}
