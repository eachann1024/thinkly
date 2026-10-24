
const SYSTEM_VOLUMES_DATA = "/system/volumes/data";

export function normalizeLocalPathSlashes(path: string): string {
  const slashes = path.replace(/\\/g, "/");
  const prefix = slashes.startsWith("//") ? "/" : "";
  return prefix + slashes.replace(/\/+/g, "/");
}

export function stripSystemVolumesDataPrefix(path: string): string {
  const normalized = normalizeLocalPathSlashes(path);
  const lower = normalized.toLowerCase();
  if (lower === SYSTEM_VOLUMES_DATA) {
    return "/";
  }
  const prefix = `${SYSTEM_VOLUMES_DATA}/`;
  if (lower.startsWith(prefix)) {
    return normalized.slice(prefix.length - 1);
  }
  return normalized;
}

export function canonicalLocalPath(path: string): string {
  return stripSystemVolumesDataPrefix(normalizeLocalPathSlashes(path.trim()));
}

export function comparisonLocalPath(
  path: string,
  caseInsensitive: boolean,
): string {
  const canonical = canonicalLocalPath(path);
  return caseInsensitive ? canonical.toLowerCase() : canonical;
}

export function localPathsAreCaseInsensitive(): boolean {
  if (typeof process !== "undefined" && typeof process.platform === "string") {
    return process.platform === "win32" || process.platform === "darwin";
  }
  if (typeof navigator !== "undefined") {
    return /Win/i.test(navigator.platform) || /Mac/i.test(navigator.platform);
  }
  return false;
}

export function isCanonicalPathInside(
  filePath: string,
  rootPath: string,
  caseInsensitive = localPathsAreCaseInsensitive(),
): boolean {
  const file = comparisonLocalPath(filePath, caseInsensitive).replace(/\/$/, "");
  const root = comparisonLocalPath(rootPath, caseInsensitive).replace(/\/$/, "");
  return file === root || file.startsWith(`${root}/`);
}

export function canonicalRelativePath(
  basePath: string,
  filePath: string,
  caseInsensitive = localPathsAreCaseInsensitive(),
): string | null {
  const base = comparisonLocalPath(basePath, caseInsensitive).replace(/\/$/, "");
  const file = comparisonLocalPath(filePath, caseInsensitive);
  if (file === base) return "";
  const prefix = `${base}/`;
  if (!file.startsWith(prefix)) return null;
  const canonicalFile = canonicalLocalPath(filePath);
  const canonicalBase = canonicalLocalPath(basePath).replace(/\/$/, "");
  return canonicalFile.slice(canonicalBase.length + 1);
}
