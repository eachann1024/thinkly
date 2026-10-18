import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { developerGitPath, gitLookupCandidates, gitVersionAcceptable, type GitLookupInput } from "../../src/lib/git-module";

const TIMEOUT_MS = 4_000;
const MAX_VERSION_CHECKS = 8;

let cached: string | null | undefined;
let inflight: Promise<string | null> | null = null;

export function gitExecutable(): string | null {
  return cached ?? null;
}

export function gitProbeSettled(): boolean {
  return cached !== undefined;
}

function lookup(developerDir?: string | null): string[] {
  return gitLookupCandidates({
    platform: process.platform,
    pathEnv: process.env.PATH || process.env.Path || "",
    home: process.env.HOME || process.env.USERPROFILE || "",
    programFiles: process.env.ProgramFiles || "",
    programFilesX86: process.env["ProgramFiles(x86)"] || "",
    localAppData: process.env.LOCALAPPDATA || "",
    developerDir,
  } satisfies GitLookupInput);
}

function run(file: string, args: string[]): Promise<{ ok: boolean; text: string }> {
  return new Promise((resolve) => {
    execFile(file, args, {
      timeout: TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    }, (error, stdout, stderr) => {
      resolve({ ok: !error, text: `${stdout ?? ""}\n${stderr ?? ""}` });
    });
  });
}

async function isFile(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function firstWorking(files: string[]): Promise<string | null> {
  let attempts = 0;
  for (const file of files) {
    if (!(await isFile(file))) continue;
    attempts += 1;
    if (attempts > MAX_VERSION_CHECKS) return null;
    const result = await run(file, ["--version"]);
    if (result.ok && gitVersionAcceptable(result.text)) return file;
  }
  return null;
}

// 未安装命令行工具时，直接执行 /usr/bin/git 会弹出系统安装框。只读 xcode-select -p。
async function readDeveloperDir(): Promise<string | null> {
  if (process.platform !== "darwin") return null;
  const result = await run("/usr/bin/xcode-select", ["-p"]);
  if (!result.ok) return null;
  return result.text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith("/")).at(-1) ?? null;
}

async function scan(): Promise<string | null> {
  const found = await firstWorking(lookup(null));
  if (found || process.platform !== "darwin") return found;
  const developer = developerGitPath(await readDeveloperDir());
  return developer ? firstWorking([developer]) : null;
}

export function probeGitBinary(force = false): Promise<string | null> {
  if (!force && cached !== undefined) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = scan().then(
    (value) => {
      cached = value;
      return value;
    },
    () => {
      cached = null;
      return null;
    },
  ).finally(() => {
    inflight = null;
  });
  return inflight;
}
