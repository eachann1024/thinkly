import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import * as nodeFs from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const nodeRequire = createRequire(import.meta.url);
const VERSION_DIR = /^\d+\.\d+\.\d+$/;
const TRASH_DIR = /^\..+\.trash-[0-9a-f]{8}$/;

export type DirectoryFs = {
  lstatSync: (target: string) => nodeFs.Stats;
  readdirSync: (target: string) => string[];
  unlinkSync: (target: string) => void;
  renameSync: (from: string, to: string) => void;
  rm: (target: string, options: nodeFs.RmOptions) => Promise<void>;
};

export type DiscardOptions = {
  fs?: DirectoryFs;
  strict?: boolean;
};

type NoAsarProcess = NodeJS.Process & { noAsar?: boolean };

function fsErrorCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}

function fsErrorPath(error: unknown): string {
  if (!error || typeof error !== "object" || !("path" in error)) return "";
  const value = (error as { path?: unknown }).path;
  return typeof value === "string" ? value : "";
}

export function isMissingFile(error: unknown): boolean {
  return fsErrorCode(error) === "ENOENT";
}

export function isFilesystemError(error: unknown): boolean {
  return fsErrorCode(error) !== "";
}

/** Node's own message already includes the errno and path; keep both if a caller wrapped it. */
export function describeFsError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown update error";
  const code = fsErrorCode(error);
  const errPath = fsErrorPath(error);
  let message = error.message || code || "unknown update error";
  if (errPath && !message.includes(errPath)) message = `${message} (${errPath})`;
  if (code && !message.startsWith(code)) message = `${code}: ${message}`;
  return message;
}

function nodeDirectoryFs(fsImpl: typeof nodeFs): DirectoryFs {
  return {
    lstatSync: (target) => fsImpl.lstatSync(target),
    readdirSync: (target) => fsImpl.readdirSync(target),
    unlinkSync: (target) => fsImpl.unlinkSync(target),
    renameSync: (from, to) => fsImpl.renameSync(from, to),
    rm: (target, options) => fsImpl.promises.rm(target, options),
  };
}

function realDirectoryFs(): DirectoryFs {
  try {
    const loaded = nodeRequire("original-" + "fs") as typeof nodeFs;
    if (typeof loaded?.unlinkSync === "function" && typeof loaded.promises?.rm === "function") {
      return nodeDirectoryFs(loaded);
    }
  } catch {
    // original-fs exists only inside Electron and is the fs module without the asar patch.
  }
  return nodeDirectoryFs(nodeFs);
}

function directoryFs(options: DiscardOptions): DirectoryFs {
  return options.fs ?? realDirectoryFs();
}

function assertDisposable(directory: string): void {
  const resolved = path.resolve(directory);
  if (!directory || resolved === path.parse(resolved).root) {
    throw Object.assign(new Error("refusing to remove this update path"), { code: "EINVAL", path: resolved || directory });
  }
}

function exists(target: string, fsImpl: DirectoryFs): boolean {
  try {
    fsImpl.lstatSync(target);
    return true;
  } catch (error) {
    if (isMissingFile(error)) return false;
    throw error;
  }
}

function runWithoutAsar<T>(fn: () => T): T {
  const current = process as NoAsarProcess;
  const previous = current.noAsar;
  current.noAsar = true;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete current.noAsar;
    else current.noAsar = previous;
  }
}

function isAsarName(name: string): boolean {
  return name.toLowerCase().endsWith(".asar");
}

function trashPrefix(basename: string): string {
  return `${basename.startsWith(".") ? basename : `.${basename}`}.trash-`;
}

function logRemoveFailure(error: unknown): void {
  console.error(`[update] could not remove update files: ${describeFsError(error)}`);
}

// Electron patches fs so a path ending in `.asar` is a virtual directory. A recursive
// rm then descends into app.asar instead of unlinking it, and rmdir of the parent
// fails with ENOTEMPTY. Unlink those archives as ordinary files first.
function unlinkAsarFiles(root: string, fsImpl: DirectoryFs): void {
  if (!exists(root, fsImpl)) return;
  runWithoutAsar(() => {
    const pending = [root];
    while (pending.length) {
      const current = pending.pop()!;
      let names: string[];
      try {
        names = fsImpl.readdirSync(current);
      } catch (error) {
        if (isMissingFile(error)) continue;
        throw error;
      }
      for (const name of names) {
        const child = path.join(current, name);
        if (isAsarName(name)) {
          try {
            fsImpl.unlinkSync(child);
          } catch (error) {
            if (!isMissingFile(error)) throw error;
          }
          continue;
        }
        let info: nodeFs.Stats;
        try {
          info = fsImpl.lstatSync(child);
        } catch (error) {
          if (isMissingFile(error)) continue;
          throw error;
        }
        if (info.isDirectory()) pending.push(child);
      }
    }
  });
}

async function removeTree(target: string, fsImpl: DirectoryFs): Promise<void> {
  assertDisposable(target);
  unlinkAsarFiles(target, fsImpl);
  await fsImpl.rm(target, { recursive: true, force: true, maxRetries: 2 });
}

async function removeTreeQuiet(target: string, fsImpl: DirectoryFs): Promise<void> {
  try {
    await removeTree(target, fsImpl);
  } catch (error) {
    logRemoveFailure(error);
  }
}

async function removeOldTrash(directory: string, fsImpl: DirectoryFs): Promise<void> {
  const parent = path.dirname(directory);
  const prefix = trashPrefix(path.basename(directory));
  let names: string[] = [];
  try {
    names = fsImpl.readdirSync(parent);
  } catch (error) {
    if (!isMissingFile(error)) logRemoveFailure(error);
    return;
  }
  for (const name of names) {
    if (!name.startsWith(prefix) || !/^[0-9a-f]{8}$/.test(name.slice(prefix.length))) continue;
    await removeTreeQuiet(path.join(parent, name), fsImpl);
  }
}

export async function discardDirectory(directory: string, options: DiscardOptions = {}): Promise<void> {
  const fsImpl = directoryFs(options);
  const strict = options.strict !== false;
  assertDisposable(directory);
  await removeOldTrash(directory, fsImpl);
  if (!exists(directory, fsImpl)) return;
  const trash = path.join(path.dirname(directory), `${trashPrefix(path.basename(directory))}${randomBytes(4).toString("hex")}`);
  try {
    fsImpl.renameSync(directory, trash);
  } catch (error) {
    if (isMissingFile(error)) return;
    try {
      await removeTree(directory, fsImpl);
    } catch (removeError) {
      if (strict) throw removeError;
      logRemoveFailure(removeError);
    }
    return;
  }
  await removeTreeQuiet(trash, fsImpl);
  if (strict && exists(directory, fsImpl)) {
    throw Object.assign(new Error(`ENOTEMPTY: directory not empty, rmdir '${directory}'`), {
      code: "ENOTEMPTY",
      syscall: "rmdir",
      path: directory,
    });
  }
}

export async function replaceUpdateDirectory(
  directory: string,
  fill: (directory: string) => Promise<void>,
  options: DiscardOptions = {},
): Promise<void> {
  await discardDirectory(directory, options);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await fill(directory);
}

export async function cleanVersionDirectories(root: string, keepVersion: string | null, options: DiscardOptions = {}): Promise<void> {
  const resolved = path.resolve(root);
  if (path.basename(resolved) !== "app-updates") {
    console.error(`[update] refused to clean a directory outside app-updates: ${resolved}`);
    return;
  }
  const fsImpl = directoryFs(options);
  let names: string[];
  try {
    names = fsImpl.readdirSync(resolved);
  } catch (error) {
    if (!isMissingFile(error)) logRemoveFailure(error);
    return;
  }
  for (const name of names) {
    if (name === keepVersion && VERSION_DIR.test(name)) continue;
    if (!VERSION_DIR.test(name) && !TRASH_DIR.test(name)) continue;
    await discardDirectory(path.join(resolved, name), { ...options, fs: fsImpl, strict: false });
  }
}
