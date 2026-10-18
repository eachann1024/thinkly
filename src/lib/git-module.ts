import { posix, win32 } from "node:path";

export type GitLookupPlatform = "darwin" | "win32" | "linux";

export interface GitLookupInput {
  platform: string;
  pathEnv?: string;
  home?: string;
  programFiles?: string;
  programFilesX86?: string;
  localAppData?: string;
  developerDir?: string | null;
}

const DARWIN_GIT_STUB = "/usr/bin/git";

export function gitVersionAcceptable(text: string): boolean {
  return /^git version \d+\.\d+/m.test(text);
}

/** 没有显式选择时，已经连过仓库的安装保持开启。 */
export function inferGitModuleEnabled(saved: unknown, configCount: number): boolean {
  if (saved && typeof saved === "object" && !Array.isArray(saved)) {
    const value = (saved as { moduleEnabled?: unknown }).moduleEnabled;
    if (typeof value === "boolean") return value;
  }
  return configCount > 0;
}

/** xcode-select -p 的结果。绝不返回会弹出「安装命令行工具」的 /usr/bin/git。 */
export function developerGitPath(dir: string | null | undefined): string | null {
  if (!dir) return null;
  const trimmed = dir.trim();
  if (!trimmed.startsWith("/") || /[\0\r\n]/.test(trimmed)) return null;
  if (trimmed.split("/").includes("..")) return null;
  const root = trimmed.replace(/\/+$/, "");
  if (!root) return null;
  const file = posix.normalize(`${root}/usr/bin/git`);
  if (file === DARWIN_GIT_STUB || file.split("/").includes("..")) return null;
  return file;
}

function platformOf(value: string): GitLookupPlatform {
  if (value === "win32" || value === "darwin") return value;
  return "linux";
}

function accept(file: string, platform: GitLookupPlatform): string | null {
  if (!file || /[\0\r\n]/.test(file)) return null;
  const api = platform === "win32" ? win32 : posix;
  if (!api.isAbsolute(file)) return null;
  const normalized = api.normalize(file);
  if (!api.isAbsolute(normalized)) return null;
  if (normalized.split(/[\\/]/).includes("..")) return null;
  if (platform === "darwin" && posix.normalize(normalized) === DARWIN_GIT_STUB) return null;
  return normalized;
}

function remember(out: string[], seen: Set<string>, file: string, platform: GitLookupPlatform) {
  const accepted = accept(file, platform);
  if (!accepted) return;
  const key = platform === "win32" ? accepted.toLowerCase() : accepted;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(accepted);
}

function joinName(dir: string, name: string, platform: GitLookupPlatform): string {
  return joinFile(platform, dir, name);
}

function joinFile(platform: GitLookupPlatform, ...parts: string[]): string {
  return (platform === "win32" ? win32 : posix).join(...parts);
}

function safeRoot(root: string | undefined, platform: GitLookupPlatform): string | null {
  if (!root || /[\0\r\n]/.test(root) || root.split(/[\\/]/).includes("..")) return null;
  const api = platform === "win32" ? win32 : posix;
  return api.isAbsolute(root) ? root : null;
}

function knownPaths(input: GitLookupInput, platform: GitLookupPlatform): string[] {
  if (platform === "win32") {
    const files: string[] = [];
    for (const root of [input.programFiles, input.programFilesX86]) {
      const base = safeRoot(root, platform);
      if (!base) continue;
      files.push(joinFile(platform, base, "Git", "cmd", "git.exe"), joinFile(platform, base, "Git", "bin", "git.exe"));
    }
    const local = safeRoot(input.localAppData, platform);
    const home = safeRoot(input.home, platform);
    if (local) files.push(joinFile(platform, local, "Programs", "Git", "cmd", "git.exe"));
    if (home) {
      files.push(
        joinFile(platform, home, "scoop", "apps", "git", "current", "cmd", "git.exe"),
        joinFile(platform, home, "scoop", "shims", "git.exe"),
      );
    }
    return files;
  }
  const files = ["/usr/local/bin/git", "/opt/homebrew/bin/git", "/opt/local/bin/git", "/usr/local/git/bin/git"];
  if (platform === "linux") files.unshift("/usr/bin/git", "/snap/bin/git", "/home/linuxbrew/.linuxbrew/bin/git");
  const home = safeRoot(input.home, platform);
  if (home) {
    const normalized = posix.normalize(home);
    files.push(`${normalized}/bin/git`, `${normalized}/.local/bin/git`, `${normalized}/.linuxbrew/bin/git`);
  }
  const developer = platform === "darwin" ? developerGitPath(input.developerDir) : null;
  if (developer) files.push(developer);
  return files;
}

/** 按 PATH、常见安装位置给出候选。macOS 排除 /usr/bin/git。 */
export function gitLookupCandidates(input: GitLookupInput): string[] {
  const platform = platformOf(input.platform);
  const name = platform === "win32" ? "git.exe" : "git";
  const delimiter = platform === "win32" ? ";" : ":";
  const out: string[] = [];
  const seen = new Set<string>();
  for (const dir of (input.pathEnv ?? "").split(delimiter).map((entry) => entry.trim()).filter(Boolean).slice(0, 64)) {
    remember(out, seen, joinName(dir, name, platform), platform);
  }
  for (const file of knownPaths(input, platform)) remember(out, seen, file, platform);
  return out;
}
