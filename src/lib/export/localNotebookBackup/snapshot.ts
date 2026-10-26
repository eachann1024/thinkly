import { BACKUP_LIMITS, MANIFEST_PATH, decodeBase64, equalBytes, fail, type BackupFiles, type LocalNotebookBackupFs } from "./contract";
import { assertDistinctPaths, assertPhysicalPath, checkedRoot, isBackupDirectoryPath, isBackupFilePath, safeRelativePath } from "./paths";

export async function collectBackupPaths(root: string, fs: LocalNotebookBackupFs): Promise<string[]> {
  const files: string[] = [];
  let entries = 0;
  const walk = async (relative: string) => {
    if (relative) await assertPhysicalPath(root, relative, fs);
    const children = await fs.readDirAsync(relative ? `${root}/${relative}` : root);
    if (!Array.isArray(children)) fail("Cannot list notebook files");
    for (const child of children) {
      if (++entries > BACKUP_LIMITS.entries * 2) fail("Too many notebook entries");
      if (typeof child.name !== "string" || child.name.includes("/") || child.name.includes("\\")) fail("Invalid directory entry");
      const name = relative ? `${relative}/${child.name}` : child.name;
      if (!safeRelativePath(name)) fail("Unsafe notebook file name");
      if (name === MANIFEST_PATH) fail("Notebook contains the reserved backup manifest path");
      if (relative === ".goose/history" && child.isFile && !child.name.startsWith(".")) fail("Legacy history must be migrated before backup");
      if (child.isDirectory && isBackupDirectoryPath(name)) await walk(name);
      else if (child.isFile && isBackupFilePath(name)) {
        await assertPhysicalPath(root, name, fs);
        files.push(name);
      }
      else if (!child.isFile && !child.isDirectory && (isBackupFilePath(name) || isBackupDirectoryPath(name))) fail("Filesystem links and special files are not supported");
    }
  };
  await checkedRoot(root, fs);
  await walk("");
  if (files.length > BACKUP_LIMITS.entries) fail("Too many backup files");
  assertDistinctPaths(files);
  return files.sort();
}

export async function readBackupFile(root: string, name: string, fs: LocalNotebookBackupFs): Promise<Uint8Array> {
  const file = await assertPhysicalPath(root, name, fs);
  const encoded = await fs.readFileBase64Async(file);
  if (encoded === null) fail("Cannot read notebook file");
  if (encoded.length > Math.ceil(BACKUP_LIMITS.fileBytes / 3) * 4) fail("Notebook file is too large");
  const bytes = decodeBase64(encoded);
  if (bytes.length > BACKUP_LIMITS.fileBytes) fail("Notebook file is too large");
  return bytes;
}

export async function readBackupSnapshot(root: string, fs: LocalNotebookBackupFs): Promise<BackupFiles> {
  const files: BackupFiles = new Map();
  let total = 0;
  for (const name of await collectBackupPaths(root, fs)) {
    const bytes = await readBackupFile(root, name, fs);
    total += bytes.length;
    if (total > BACKUP_LIMITS.totalBytes) fail("Notebook exceeds backup size budget");
    files.set(name, bytes);
  }
  return files;
}

export async function assertSnapshotUnchanged(root: string, files: BackupFiles, fs: LocalNotebookBackupFs): Promise<void> {
  const current = await collectBackupPaths(root, fs);
  if (JSON.stringify(current) !== JSON.stringify([...files.keys()])) fail("Notebook files changed while creating the backup");
  for (const [name, bytes] of files) {
    if (!equalBytes(bytes, await readBackupFile(root, name, fs))) fail("Notebook changed while creating the backup");
  }
}
