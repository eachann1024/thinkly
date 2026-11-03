import { applyAccentColor } from "@/lib/accentColor";
import { applyAppearanceScaleVariables } from "@/lib/appearance";
import { applyAppearanceSnapshot } from "@/lib/appearanceSync";
import type { AssetAppearance } from "@/lib/asset-maintenance-contract";
import { applyFontSmoothing, applyFontVariables } from "@/lib/fontLoader";
import { applyTheme } from "@/stores/settings/theme";
import { useSettings } from "@/stores/useSettings";

// Paint a snapshot even when it matches the unsaved defaults. The standalone
// partition must not rehydrate settings: that would load empty storage and
// overwrite this snapshot with the default theme.
export function applyStandaloneAppearance(snapshot: AssetAppearance): void {
  applyAppearanceSnapshot(snapshot);
  const state = useSettings.getState();
  applyTheme(state.theme);
  applyAccentColor(state.accentColor);
  applyFontVariables(state.customFonts, state);
  applyFontSmoothing(state.fontSmoothing);
  applyAppearanceScaleVariables({
    uiFontSize: state.uiFontSize,
    editorFontSize: state.editorFontSize,
    editorLineHeight: state.editorLineHeight,
  });
}
