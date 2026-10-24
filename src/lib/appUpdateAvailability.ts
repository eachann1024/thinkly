import { parseReleaseTag, readyVersionIsNewer } from "./appUpdateRelease";
import type { AppUpdateState } from "./appUpdateTypes";

export function hasNewAppUpdate(currentVersion: string, state: AppUpdateState): boolean {
  const current = parseReleaseTag(currentVersion);
  const target = state.version ? parseReleaseTag(state.version) : null;
  return Boolean(current && target && readyVersionIsNewer(target.version, current.version)
    && state.status !== "idle" && state.status !== "checking" && state.status !== "up-to-date");
}
