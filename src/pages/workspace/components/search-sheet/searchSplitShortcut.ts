import type { OpenBesidePlacement } from "@/lib/editor-split/openPageBeside";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import { getPlatformKind, type PlatformKind } from "@/lib/utils";

const ARROW_PLACEMENT: Record<string, OpenBesidePlacement> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "top",
  ArrowDown: "bottom",
};

type SplitKeyEvent = Pick<
  KeyboardEvent,
  "key" | "altKey" | "shiftKey" | "metaKey" | "ctrlKey" | "repeat"
>;

/** 搜索结果上的分屏：macOS 用 ⌘，Windows / Linux 用 Ctrl，加上方向键。 */
export function searchSplitPlacement(
  event: SplitKeyEvent,
  platform: PlatformKind = getPlatformKind(),
): OpenBesidePlacement | null {
  if (event.altKey || event.shiftKey || event.repeat) return null;
  if (!isPlatformPrimaryModifierEvent(event, platform)) return null;
  return ARROW_PLACEMENT[event.key] ?? null;
}
