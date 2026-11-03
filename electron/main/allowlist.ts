import { t } from "./i18n/nativeServices";
import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { canonicalLocalPath } from "../../src/lib/canonicalLocalPath";
import { physicalLocalPath } from "./physicalLocalPath";

const ROOTS_FILE = "vault-roots.json";
const GRANTED_FILE = "granted-folders.json";

const vaultRoots = new Set<string>();
const grantedFolders = new Set<string>();
const sessionAllowed = new Set<string>();

export function normalizePath(p: string): string {
  return canonicalLocalPath(path.resolve(p));
}

export function attachmentsRoot(): string {
  return path.join(app.getPath("userData"), "attachments");
}

export function userDataRoot(): string {
  return app.getPath("userData");
}

export function downloadsRoot(): string {
  return app.getPath("downloads");
}

export function loadVaultRoots(): void {
  readPathList(ROOTS_FILE, vaultRoots);
  readPathList(GRANTED_FILE, grantedFolders);
  mkdirSync(attachmentsRoot(), { recursive: true });
}

function readPathList(file: string, target: Set<string>): void {
  target.clear();
  try {
    const parsed = JSON.parse(readFileSync(path.join(app.getPath("userData"), file), "utf8"));
    if (!Array.isArray(parsed)) return;
    for (const entry of parsed) {
      if (typeof entry === "string" && entry.trim()) target.add(normalizePath(entry));
    }
  } catch {
  }
}

function writePathList(file: string, source: Set<string>): void {
  mkdirSync(app.getPath("userData"), { recursive: true });
  writeFileSync(path.join(app.getPath("userData"), file), JSON.stringify([...source], null, 2));
}

function persistVaultRoots(): void {
  writePathList(ROOTS_FILE, vaultRoots);
}

/** Folders the user granted through the access prompt; kept across restarts. */
export function addGrantedFolder(p: string): string {
  const resolved = normalizePath(p);
  if (grantedFolders.has(resolved)) return resolved;
  for (const existing of [...grantedFolders]) {
    if (isUnder(resolved, existing)) grantedFolders.delete(existing);
  }
  grantedFolders.add(resolved);
  writePathList(GRANTED_FILE, grantedFolders);
  return resolved;
}

export function listVaultRoots(): string[] {
  return [...vaultRoots];
}

export function addVaultRoot(p: string): string {
  const resolved = normalizePath(p);
  vaultRoots.add(resolved);
  persistVaultRoots();
  return resolved;
}

export function replaceVaultRoot(from: string, to: string): void {
  const oldKey = normalizePath(from);
  const nextKey = normalizePath(to);
  const current = vaultRoots.has(oldKey)
    ? oldKey
    : [...vaultRoots].find((root) => root.toLowerCase() === oldKey.toLowerCase());
  if (!current || current === nextKey) return;
  vaultRoots.delete(current);
  vaultRoots.add(nextKey);
  for (const allowed of [...sessionAllowed]) {
    if (allowed !== current && !isUnder(current, allowed)) continue;
    sessionAllowed.delete(allowed);
    const relative = path.relative(current, allowed);
    sessionAllowed.add(relative ? normalizePath(path.join(nextKey, relative)) : nextKey);
  }
  persistVaultRoots();
}

export function addSessionAllowed(p: string): string {
  const resolved = normalizePath(p);
  sessionAllowed.add(resolved);
  return resolved;
}

export function hasUnsafeSegments(p: string): boolean {
  return p.split(/[/\\]/).includes("..") || p.includes("\0");
}

function isUnder(root: string, target: string, caseInsensitive = process.platform === "win32" || process.platform === "darwin"): boolean {
  const from = normalizePath(root);
  const to = normalizePath(target);
  let relFrom = from;
  let relTo = to;
  if (caseInsensitive) {
    relFrom = from.toLowerCase();
    relTo = to.toLowerCase();
  }
  const rel = path.relative(relFrom, relTo);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function allowedRoots(): string[] {
  return [userDataRoot(), downloadsRoot(), ...vaultRoots, ...grantedFolders, ...sessionAllowed];
}

function physicalAllowedRoots(roots: string[]): string[] {
  return roots.map(physicalLocalPath).filter((root): root is string => root !== null);
}

function isWithinAllowedRoot(root: string, target: string, physicalRoots: string[]): boolean {
  const physicalRoot = physicalLocalPath(root);
  if (!physicalRoot || (!isUnder(root, target) && !isUnder(physicalRoot, target))) return false;
  const physicalTarget = physicalLocalPath(target);
  return physicalTarget !== null && physicalRoots.some((allowed) => isUnder(allowed, physicalTarget, false));
}

export function findVaultRootContaining(p: string): string | null {
  if (hasUnsafeSegments(p)) return null;
  const resolved = normalizePath(p);
  let best: string | null = null;
  const physicalRoots = physicalAllowedRoots(allowedRoots());
  for (const root of vaultRoots) {
    if (!isWithinAllowedRoot(root, resolved, physicalRoots)) continue;
    if (!best || root.length > best.length) best = root;
  }
  return best;
}

export function allowAssociatedMarkdownFile(filePath: string): string {
  const resolved = normalizePath(filePath);
  addSessionAllowed(resolved);
  return resolved;
}

export function isAllowedPath(p: string): boolean {
  if (hasUnsafeSegments(p)) return false;
  const resolved = normalizePath(p);
  const roots = allowedRoots();
  const physicalRoots = physicalAllowedRoots(roots);
  return roots.some((root) => isWithinAllowedRoot(root, resolved, physicalRoots));
}

export function assertAllowed(p: string): string {
  if (hasUnsafeSegments(p)) {
    throw new Error(t("parentPath"));
  }
  const resolved = normalizePath(p);
  if (!isAllowedPath(resolved)) {
    throw new Error(t("outsideAllowed"));
  }
  return resolved;
}

export function normalizeLocalOpenPath(p: string): string | null {
  if (hasUnsafeSegments(p)) return null;
  const trimmed = p.trim();
  if (!trimmed.startsWith("/") && !trimmed.startsWith("\\\\") && !/^[A-Za-z]:[\\/]/.test(trimmed)) {
    return null;
  }
  return normalizePath(trimmed);
}

export function assertExistingOpenPath(p: string): string {
  const resolved = normalizeLocalOpenPath(p);
  if (!resolved) {
    throw new Error(t("parentPath"));
  }
  if (!pathExists(resolved)) {
    throw new Error(t("pathMissing"));
  }
  return resolved;
}

export function assertAllowedOpen(p: string): string {
  return assertAllowed(p);
}

export function ensureParentDir(filePath: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

export function pathExists(p: string): boolean {
  try {
    return existsSync(p);
  } catch {
    return false;
  }
}
