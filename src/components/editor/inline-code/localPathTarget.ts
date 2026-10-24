
import { resolvePhysicalResourcePath } from "@/components/editor/utils/openResourceExternally";

const MAX_PATH_LENGTH = 1024;
const PROBE_TTL_MS = 5000;
const PROBE_CACHE_MAX = 300;

function lastSegment(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1];
}

function hasExtension(segment: string): boolean {
  const dot = segment.lastIndexOf(".");
  return dot > 0 && dot < segment.length - 1;
}

function hasUnsafePathChars(text: string): boolean {
  return text.includes("://") || /[\n\r\0|*?<>"]/.test(text);
}

export function isAbsoluteLocalPath(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2 || trimmed.length > MAX_PATH_LENGTH) return false;
  if (hasUnsafePathChars(trimmed)) return false;
  if (trimmed.startsWith("//")) return false;
  return trimmed.startsWith("/") || /^[A-Za-z]:[\\/]/.test(trimmed);
}

export function isRelativePathCandidate(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length <= 2 || trimmed.length > MAX_PATH_LENGTH) return false;
  if (!trimmed.startsWith("./") && !trimmed.startsWith("../")) return false;
  if (hasUnsafePathChars(trimmed)) return false;
  const rest = trimmed.startsWith("../") ? trimmed.slice(3) : trimmed.slice(2);
  if (rest.length === 0) return false;
  if (trimmed.endsWith("/") || trimmed.endsWith("\\")) return false;
  const segment = lastSegment(trimmed);
  if (!hasExtension(segment)) return true;
  return segment.slice(segment.lastIndexOf(".")).toLowerCase() === ".md";
}

export function isRelativeDirectoryCandidate(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length <= 3 || trimmed.length > MAX_PATH_LENGTH) return false;
  if (!trimmed.startsWith("./") && !trimmed.startsWith("../")) return false;
  if (hasUnsafePathChars(trimmed)) return false;
  if (!trimmed.endsWith("/") && !trimmed.endsWith("\\")) return false;
  const rest = trimmed.startsWith("../") ? trimmed.slice(3) : trimmed.slice(2);
  return rest.length > 1;
}

export function toOpenTarget(text: string): string | null {
  const trimmed = text.trim();
  if (isAbsoluteLocalPath(trimmed) || isRelativeDirectoryCandidate(trimmed)) {
    return trimmed;
  }
  return toMarkdownTarget(trimmed);
}

export function toMarkdownTarget(text: string): string | null {
  const trimmed = text.trim();
  if (!isRelativePathCandidate(trimmed)) return null;
  const segment = lastSegment(trimmed);
  return hasExtension(segment) ? trimmed : `${trimmed}.md`;
}

export function resolveCandidatePath(
  text: string,
  pageLocalFilePath: string,
): string | null {
  const trimmed = text.trim();
  if (isAbsoluteLocalPath(trimmed)) {
    return resolvePhysicalResourcePath(trimmed, pageLocalFilePath);
  }
  if (!isRelativePathCandidate(trimmed) && !isRelativeDirectoryCandidate(trimmed)) {
    return null;
  }
  const resolved = resolvePhysicalResourcePath(trimmed, pageLocalFilePath);
  if (!resolved) return null;
  if (escapesBase(trimmed, pageLocalFilePath)) return null;
  return resolved;
}

function escapesBase(reference: string, pagePath: string): boolean {
  const separator = pagePath.includes("\\") ? "\\" : "/";
  const base = pagePath.replace(/[\\/][^\\/]+$/, "");
  const parts = `${base}${separator}${reference}`.split(/[\\/]/);
  let depth = 0;
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (depth === 0) return true;
      depth -= 1;
    } else {
      depth += 1;
    }
  }
  return false;
}

function comparisonPath(filePath: string): string {
  let normalized = filePath.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  normalized = normalized.replace(/\/+$/, "");
  return /^[A-Za-z]:/.test(normalized) ? normalized.toLowerCase() : normalized;
}

export function isInsideRoot(absPath: string, root: string): boolean {
  const abs = comparisonPath(absPath);
  const base = comparisonPath(root);
  if (!base) return false;
  return abs.startsWith(`${base}/`);
}

export type PathProbeState = "unknown" | "pending" | "hit" | "miss";

type ProbeEntry = { state: "pending" | "hit" | "miss"; ts: number };

const probeCache = new Map<string, ProbeEntry>();

function rememberProbe(absPath: string, entry: ProbeEntry): void {
  probeCache.delete(absPath);
  probeCache.set(absPath, entry);
  while (probeCache.size > PROBE_CACHE_MAX) {
    const oldest = probeCache.keys().next().value as string | undefined;
    if (oldest === undefined) return;
    probeCache.delete(oldest);
  }
}

export function peekProbe(absPath: string): PathProbeState {
  const entry = probeCache.get(absPath);
  if (!entry) return "unknown";
  if (Date.now() - entry.ts > PROBE_TTL_MS) {
    probeCache.delete(absPath);
    return "unknown";
  }
  return entry.state;
}

export function probePath(
  absPath: string,
  existsAsync: (p: string) => Promise<boolean>,
  onSettled: () => void,
): void {
  if (peekProbe(absPath) !== "unknown") return;
  rememberProbe(absPath, { state: "pending", ts: Date.now() });
  existsAsync(absPath).then(
    (exists) => {
      rememberProbe(absPath, { state: exists ? "hit" : "miss", ts: Date.now() });
      onSettled();
    },
    () => {
      rememberProbe(absPath, { state: "miss", ts: Date.now() });
      onSettled();
    },
  );
}

export function __resetProbeCacheForTests(): void {
  probeCache.clear();
}
