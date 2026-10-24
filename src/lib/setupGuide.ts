import { firstRunSurface } from "./characterGuide";

export function isSetupGuideVisible(settings: {
  _hasHydrated: boolean;
  setupGuideOpen: boolean;
  setupGuideSeen: boolean;
  characterId: string | null;
}): boolean {
  const surface = firstRunSurface(settings);
  return surface === "character" || surface === "setup";
}
