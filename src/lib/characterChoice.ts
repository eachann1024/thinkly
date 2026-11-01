export function resolveStoredCharacterId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function characterGuideShouldShow(input: {
  hydrated: boolean;
  characterId: string | null;
  knownCharacterIds: readonly string[];
}): boolean {
  if (!input.hydrated || input.knownCharacterIds.length === 0) return false;
  return !input.knownCharacterIds.includes(input.characterId ?? "");
}

export type FirstRunSurface = "setup" | "app";

export function firstRunSurface(
  settings: {
    _hasHydrated: boolean;
    characterId: string | null;
    setupGuideSeen: boolean;
    setupGuideOpen: boolean;
  },
): FirstRunSurface {
  if (settings._hasHydrated && (settings.setupGuideOpen || !settings.setupGuideSeen)) return "setup";
  return "app";
}
