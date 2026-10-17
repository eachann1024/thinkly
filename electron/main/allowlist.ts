import { t } from "./i18n/nativeServices";
import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { canonicalLocalPath } from "../../src/lib/canonicalLocalPath";

const ROOTS_FILE = "vault-roots.json";

const vaultRoots = new Set<string>();
const sessionAllowed = new Set<string>();

export function normalizePath(p: string): string {
  return canonicalLocalPath(path.resolve(p));
}

function rootsFilePath(): string {
  return path.join(app.getPath("userData"), ROOTS_FILE);
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
  vaultRoots.clear();
  try {
    const raw = readFileSync(rootsFilePath(), "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        if (typeof entry === "string" && entry.trim()) {
          vaultRoots.add(normalizePath(entry));
        }
      }
    }
  } catch {
    // first run or corrupt file
  }
  mkdirSync(attachmentsRoot(), { recursive: true });
}

function persistVaultRoots(): void {
  mkdirSync(app.getPath("userData"), { recursive: true });
  writeFileSync(rootsFilePath(), JSON.stringify([...vaultRoots], null, 2));
}

export function addVaultRoot(p: string): string {
  const resolved = normalizePath(p);
  vaultRoots.add(resolved);
  persistVaultRoots();
  return resolved;
}

/** 笔记本根目录改名后，允许列表必须跟着新路径，否则后续读写会被拒绝。 */
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

function isUnder(root: string, target: string): boolean {
  const from = normalizePath(root);
  const to = normalizePath(target);
  let relFrom = from;
  let relTo = to;
  if (process.platform === "win32" || process.platform === "darwin") {
    relFrom = from.toLowerCase();
    relTo = to.toLowerCase();
  }
  const rel = path.relative(relFrom, relTo);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export function findVaultRootContaining(p: string): string | null {
  if (hasUnsafeSegments(p)) return null;
  const resolved = normalizePath(p);
  let best: string | null = null;
  for (const root of vaultRoots) {
    if (!isUnder(root, resolved)) continue;
    if (!best || root.length > best.length) best = root;
  }
  return best;
}

/** 系统「打开方式」选中的 md：允许读该文件，必要时把父目录登记为仓库根。 */
export function allowAssociatedMarkdownFile(filePath: string): string {
  const resolved = normalizePath(filePath);
  addSessionAllowed(resolved);
  const parent = path.dirname(resolved);
  const root = path.parse(resolved).root;
  if (parent && parent !== resolved && parent !== root) {
    addSessionAllowed(parent);
    if (!findVaultRootContaining(resolved)) {
      addVaultRoot(parent);
    }
  }
  return resolved;
}

export function isAllowedPath(p: string): boolean {
  if (hasUnsafeSegments(p)) return false;
  const resolved = normalizePath(p);
  if (isUnder(attachmentsRoot(), resolved)) return true;
  if (isUnder(userDataRoot(), resolved)) return true;
  if (isUnder(downloadsRoot(), resolved)) return true;
  for (const root of vaultRoots) {
    if (isUnder(root, resolved)) return true;
  }
  for (const allowed of sessionAllowed) {
    if (resolved === allowed || isUnder(allowed, resolved)) return true;
  }
  return false;
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

/** 规范化本机绝对路径，供打开或探测存在性。不在仓库白名单内也不授予读写。 */
export function normalizeLocalOpenPath(p: string): string | null {
  if (hasUnsafeSegments(p)) return null;
  const trimmed = p.trim();
  if (!trimmed.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(trimmed)) {
    return null;
  }
  return normalizePath(trimmed);
}

/** 打开已存在的本机文件或文件夹，不要求落在仓库白名单内。不存在或含 .. 的路径拒绝。 */
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
