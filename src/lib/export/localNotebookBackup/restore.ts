import { MANIFEST_PATH, decodeBase64, encodeBase64, equalBytes, fail, type BackupFiles, type LocalNotebookBackupFs } from "./contract";
import { assertDistinctPaths, assertPhysicalPath, checkedRoot, safeRelativePath } from "./paths";
import { readBackupArchive } from "./archive";
import { validateManifest } from "./manifest";
import { validateBackupFiles } from "./validate";

async function assertEmpty(root: string, fs: LocalNotebookBackupFs): Promise<void> {
  await checkedRoot(root, fs);
  const entries = await fs.readDirAsync(root);
  if (!Array.isArray(entries) || entries.length) fail("Restore requires a new empty target directory");
}

async function rollback(root: string, written: BackupFiles, directories: string[], fs: LocalNotebookBackupFs): Promise<void> {
  const errors: string[] = [];
  for (const [name, expected] of [...written].reverse()) {
    try {
      if (!await fs.existsAsync(`${root}/${name}`)) continue;
      await assertPhysicalPath(root, name, fs);
      const raw = await fs.readFileBase64Async(`${root}/${name}`);
      if (raw === null) throw new Error("Cannot inspect created file");
      const actual = decodeBase64(raw);
      if (!equalBytes(actual, expected)) throw new Error("Created file changed externally");
      if (!await fs.deleteFile(`${root}/${name}`)) throw new Error("Cannot remove created file");
    } catch { errors.push(name); }
  }
  for (const name of [...directories].reverse()) {
    try {
      if (!await fs.existsAsync(`${root}/${name}`)) continue;
      await assertPhysicalPath(root, name, fs);
      const entries = await fs.readDirAsync(`${root}/${name}`);
      if (!Array.isArray(entries) || entries.length || !await fs.deleteDir(`${root}/${name}`)) throw new Error("Cannot remove created directory");
    } catch { errors.push(name); }
  }
  if (errors.length) fail(`Restore failed; cleanup incomplete (${errors.join(", ")})`);
}

async function writeFiles(root: string, files: BackupFiles, fs: LocalNotebookBackupFs): Promise<void> {
  const directories: string[] = [];
  const written: BackupFiles = new Map();
  try {
    for (const [name, bytes] of files) {
      await checkedRoot(root, fs);
      const parts = name.split("/");
      parts.pop();
      let directory = "";
      for (const part of parts) {
        directory = directory ? `${directory}/${part}` : part;
        if (!directories.includes(directory)) {
          if (await fs.existsAsync(`${root}/${directory}`)) fail("Restore directory appeared externally");
          if (!await fs.mkdir(`${root}/${directory}`)) fail("Cannot create restore directory");
          directories.push(directory);
        }
        await assertPhysicalPath(root, directory, fs);
      }
      const file = `${root}/${name}`;
      if (!await fs.createFileAsync(file, encodeBase64(bytes), "base64")) fail("Cannot exclusively create restore file");
      written.set(name, bytes);
      await assertPhysicalPath(root, name, fs);
      const actual = await fs.readFileBase64Async(file);
      if (actual === null || !equalBytes(decodeBase64(actual), bytes)) fail("Restore write verification failed");
    }
    const expected = new Set([...files.keys(), ...directories]);
    const walk = async (relative: string) => {
      const entries = await fs.readDirAsync(relative ? `${root}/${relative}` : root);
      for (const entry of entries) {
        const name = relative ? `${relative}/${entry.name}` : entry.name;
        if (!expected.delete(name)) fail("Restore target changed externally");
        await assertPhysicalPath(root, name, fs);
        if (entry.isDirectory) await walk(name);
        else {
          const raw = await fs.readFileBase64Async(`${root}/${name}`);
          if (raw === null || !equalBytes(decodeBase64(raw), files.get(name)!)) fail("Restored file changed externally");
        }
      }
    };
    await walk("");
    if (expected.size) fail("Restored files disappeared");
  } catch (error) {
    try { await rollback(root, written, directories, fs); }
    catch (cleanup) { throw new Error(`${cleanup instanceof Error ? cleanup.message : cleanup}; original failure: ${error instanceof Error ? error.message : error}`, { cause: error }); }
    throw error;
  }
}

export async function restoreLocalNotebookBackup(blob: Blob, targetRoot: string, fs: LocalNotebookBackupFs): Promise<{ notebookId: string; files: number; bytes: number }> {
  const { files, notebookId } = await readValidatedNotebookBackup(blob);
  await restoreValidatedBackupFiles(files, targetRoot, fs);
  return { notebookId, files: files.size, bytes: [...files.values()].reduce((sum, bytes) => sum + bytes.length, 0) };
}

export async function readValidatedNotebookBackup(blob: Blob): Promise<{ files: BackupFiles; notebookId: string }> {
  const files = await readBackupArchive(blob);
  const manifest = await validateManifest(files);
  files.delete(MANIFEST_PATH);
  const notebookId = await validateBackupFiles(files);
  if (notebookId !== manifest.notebookId) fail("Notebook manifest identity differs");
  return { files, notebookId };
}

export async function restoreValidatedBackupFiles(files: BackupFiles, targetRoot: string, fs: LocalNotebookBackupFs): Promise<void> {
  if ([...files.keys()].some((name) => !safeRelativePath(name))) fail("Unsafe restore path");
  assertDistinctPaths([...files.keys()]);
  const root = await checkedRoot(targetRoot, fs);
  await assertEmpty(root, fs);
  await writeFiles(root, files, fs);
}
