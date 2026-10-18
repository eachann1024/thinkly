import { CHARACTERS, findCharacter } from "@/components/ui/dot-matrix/character/registry";

/** 首启形象引导：设置水合后，尚未选择（或所选形象已移除）时显示。 */
export function isCharacterGuideVisible(settings: {
  _hasHydrated: boolean;
  characterId: string | null;
}): boolean {
  return settings._hasHydrated && CHARACTERS.length > 0 && !findCharacter(settings.characterId);
}

export const CHARACTER_SETTINGS_ANCHOR = "character";

/** 打开设置的外观分区，并滚动到形象选择处、聚焦当前形象。 */
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
