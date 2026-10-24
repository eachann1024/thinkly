import { isElectronRuntime } from "@/lib/electron/runtime";
import { useSettings } from "@/stores/useSettings";

export function effectiveSingleTabMode(
  singleTabMode: boolean = useSettings.getState().singleTabMode,
  isElectron: boolean = isElectronRuntime(),
): boolean {
  return Boolean(singleTabMode) && !isElectron;
}

export function useEffectiveSingleTabMode(): boolean {
  const singleTabMode = useSettings((state) => state.singleTabMode);
  return effectiveSingleTabMode(singleTabMode);
}
