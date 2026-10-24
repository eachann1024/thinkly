import { t } from "./i18n/nativeServices";
import { createReadStream } from "node:fs";
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { AssetMaintenanceFs } from "../../src/lib/local-folder-asset-maintenance";

export function isInsideNotebook(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

export async function assertNotebookPath(root: string, target: string): Promise<string> {
  const resolved = path.resolve(target);
  if (resolved !== root && !isInsideNotebook(root, resolved)) throw new Error(t("outsideNotebook"));
  const parts = path.relative(root, resolved).split(path.sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw new Error(t("removeSymlink", { path: current }));
  }
  const canonical = await realpath(resolved);
  if (canonical !== root && !isInsideNotebook(root, canonical)) throw new Error(t("canonicalOutsideNotebook"));
  return canonical;
}

export function notebookScanFs(root: string): AssetMaintenanceFs {
  const syncUnavailable = (): never => { throw new Error(t("asyncRequired")); };
  return {
    readDir: syncUnavailable,
    readFile: syncUnavailable,
    exists: syncUnavailable,
    readDirAsync: async (directory) => {
      await assertNotebookPath(root, directory);
      const entries = await readdir(directory, { withFileTypes: true });
      return Promise.all(entries.map(async (entry) => {
        const filePath = path.join(directory, entry.name);
        if (entry.isSymbolicLink()) throw new Error(t("notebookSymlink", { path: filePath }));
        const info = await lstat(filePath);
        return { name: entry.name, path: filePath, isFile: info.isFile(), isDirectory: info.isDirectory(), size: info.size };
      }));
    },
    readFileAsync: async (filePath) => readFile(await assertNotebookPath(root, filePath), "utf8"),
  };
}

export async function assetFingerprint(root: string, filePath: string): Promise<string> {
  await assertNotebookPath(root, filePath);
  const info = await lstat(filePath);
  if (!info.isFile()) throw new Error(t("notRegularFile"));
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) digest.update(chunk);
  const hash = digest.digest("hex");
  return `${info.dev}:${info.ino}:${info.size}:${info.mtimeMs}:${info.ctimeMs}:${hash}`;
}
