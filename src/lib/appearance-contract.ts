import type { AssetAppearance } from "./asset-maintenance-contract";
import type { ResolvedTheme } from "./resolvedTheme";
export type AppearanceSnapshot = AssetAppearance & { resolvedTheme: ResolvedTheme; backgroundColor: string };
export interface AppearanceBridge {
  get: () => Promise<AppearanceSnapshot | null>;
  publish: (snapshot: AppearanceSnapshot) => void;
  onChanged: (callback: (snapshot: AppearanceSnapshot) => void) => () => void;
}
export const APPEARANCE_KEYS = ["theme", "accentColor", "customFonts", "uiFontSize", "editorFontSize", "editorLineHeight", "sidebarFontSize", "uiFontFamily"] as const;
