import type { AuxiliaryImageExportSettings } from "@/lib/auxiliary-window/contract";
import { normalizeCardThemeId } from "@/lib/imageExport/themes";
import {
  normalizeWatermarkConfig,
  type WatermarkConfig,
} from "@/lib/imageExport/watermark";
import { useSettings } from "@/stores/useSettings";

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Writes image-export theme and footer choices from the standalone window. */
export function applyAuxiliaryImageExportSettings(
  settings: AuxiliaryImageExportSettings,
): boolean {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return false;
  const watermark = settings.watermark;
  if (!watermark || typeof watermark !== "object" || Array.isArray(watermark)) return false;
  const current = useSettings.getState().imageExportWatermark;
  const brandText = typeof watermark.brandText === "string" ? watermark.brandText.slice(0, 24) : current.brandText;
  const next: WatermarkConfig = normalizeWatermarkConfig({
    showWatermark: flag(watermark.showWatermark, current.showWatermark),
    showBrand: flag(watermark.showBrand, current.showBrand),
    showDate: flag(watermark.showDate, current.showDate),
    showTime: flag(watermark.showTime, current.showTime),
    showTitle: flag(watermark.showTitle, current.showTitle),
    brandText,
  });
  useSettings.getState().setImageExportThemeId(normalizeCardThemeId(settings.themeId));
  useSettings.getState().setImageExportWatermark(next);
  return true;
}
