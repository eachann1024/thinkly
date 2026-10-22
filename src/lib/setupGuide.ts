import { firstRunSurface } from "./characterGuide";

/**
 * A reopened guide is visible without resetting the saved first-run flag.
 * 首启形象引导同样视为引导中：热键与工作区入口一并暂停。
 */
export function isSetupGuideVisible(settings: {
  _hasHydrated: boolean;
  setupGuideOpen: boolean;
  setupGuideSeen: boolean;
  characterId: string | null;
}): boolean {
  const surface = firstRunSurface(settings);
  return surface === "character" || surface === "setup";
}
