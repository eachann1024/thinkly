/** 已写入的形象 id 原样保留；缺省或非字符串表示还没选过。 */
export function resolveStoredCharacterId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** 水合之后，只有还没有有效形象时才弹出选择。没有可选项时不弹。 */
export function characterGuideShouldShow(input: {
  hydrated: boolean;
  characterId: string | null;
  knownCharacterIds: readonly string[];
}): boolean {
  if (!input.hydrated || input.knownCharacterIds.length === 0) return false;
  return !input.knownCharacterIds.includes(input.characterId ?? "");
}

export type FirstRunSurface = "character" | "setup" | "app";

/**
 * 新用户先选形象，再进设置引导，然后直接进工作区。
 * 没有欢迎动画这一步。
 */
export function firstRunSurface(
  settings: {
    _hasHydrated: boolean;
    characterId: string | null;
    setupGuideSeen: boolean;
    setupGuideOpen: boolean;
  },
  knownCharacterIds: readonly string[],
): FirstRunSurface {
  if (characterGuideShouldShow({
    hydrated: settings._hasHydrated,
    characterId: settings.characterId,
    knownCharacterIds,
  })) return "character";
  if (settings._hasHydrated && (settings.setupGuideOpen || !settings.setupGuideSeen)) return "setup";
  return "app";
}
