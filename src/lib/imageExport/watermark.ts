import { createTranslator, getFormatLocale, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/watermark.ts#localMessages:1">`
zh-Hans:
  gooseNotes: "思绪 · Thinkly"
en:
  gooseNotes: "Thinkly"
ja:
  gooseNotes: "Thinkly"
`;
const uiText = createTranslator(localMessages);
import type { CardTheme } from "./themes";


export interface WatermarkConfig {
  showWatermark: boolean;
  showBrand: boolean;
  showDate: boolean;
  showTime: boolean;
  showTitle: boolean;
}

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  showWatermark: true,
  showBrand: true,
  showDate: true,
  showTime: true,
  showTitle: true,
};

export function normalizeWatermarkConfig(
  config?: Partial<WatermarkConfig> | null,
): WatermarkConfig {
  return { ...DEFAULT_WATERMARK_CONFIG, ...(config ?? {}) };
}

export function getWatermarkHTML(
  theme: CardTheme,
  config: WatermarkConfig = DEFAULT_WATERMARK_CONFIG,
): string {
  if (!theme.watermarkVisible || !config.showWatermark) return "";

  const brandParts: string[] = [];
  if (config.showBrand) brandParts.push(uiText("gooseNotes"));
  const brandHtml = brandParts.length > 0
    ? `<span class="gooseshot-watermark-brand">${brandParts.join(" · ")}</span>`
    : "";

  let dateHtml = "";
  if (config.showDate) {
    const now = new Date();
    const dateStr = now.toLocaleDateString(getFormatLocale());
    const timeStr = config.showTime
      ? ` ${now.toLocaleTimeString(getFormatLocale())}`
      : "";
    dateHtml = `<div class="gooseshot-watermark-date">${dateStr}${timeStr}</div>`;
  }

  return `<div class="gooseshot-watermark">
    <div class="gooseshot-watermark-left">${brandHtml}</div>
    ${dateHtml}
  </div>`;
}
