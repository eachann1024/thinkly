import { useCallback, useSyncExternalStore } from "react";
import type { Theme } from "@/stores/settings/types";
import { resolveTheme, subscribeResolvedTheme } from "@/lib/resolvedTheme";
export { resolveTheme } from "@/lib/resolvedTheme";
export type { ResolvedTheme } from "@/lib/resolvedTheme";
export function useResolvedTheme(theme: Theme) {
  const getSnapshot = useCallback(() => resolveTheme(theme), [theme]);
  const getServerSnapshot = useCallback(() => resolveTheme(theme, false), [theme]);
  return useSyncExternalStore(subscribeResolvedTheme, getSnapshot, getServerSnapshot);
}
