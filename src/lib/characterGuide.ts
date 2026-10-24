import { CHARACTERS } from "@/components/ui/dot-matrix/character/registry";
import {
  characterGuideShouldShow,
  firstRunSurface as chooseFirstRunSurface,
  type FirstRunSurface,
} from "@/lib/characterChoice";

export {
  characterGuideShouldShow,
  resolveStoredCharacterId,
  type FirstRunSurface,
} from "@/lib/characterChoice";

export const KNOWN_CHARACTER_IDS: readonly string[] = CHARACTERS.map((item) => item.id);

export function isCharacterGuideVisible(settings: {
  _hasHydrated: boolean;
  characterId: string | null;
}): boolean {
  return characterGuideShouldShow({
    hydrated: settings._hasHydrated,
    characterId: settings.characterId,
    knownCharacterIds: KNOWN_CHARACTER_IDS,
  });
}

export function firstRunSurface(settings: {
  _hasHydrated: boolean;
  characterId: string | null;
  setupGuideSeen: boolean;
  setupGuideOpen: boolean;
}): FirstRunSurface {
  return chooseFirstRunSurface(settings, KNOWN_CHARACTER_IDS);
}

export const CHARACTER_SETTINGS_ANCHOR = "character";

export function openCharacterSettings(): void {
  window.dispatchEvent(new CustomEvent("goose-note:open-settings", { detail: { tab: "appearance" } }));
  let frames = 0;
  const reveal = () => {
    const anchor = document.querySelector<HTMLElement>(`[data-settings-anchor="${CHARACTER_SETTINGS_ANCHOR}"]`);
    if (!anchor || anchor.offsetParent === null) {
      if (++frames < 30) requestAnimationFrame(reveal);
      return;
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    anchor.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
    anchor.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus({ preventScroll: true });
  };
  requestAnimationFrame(reveal);
}
