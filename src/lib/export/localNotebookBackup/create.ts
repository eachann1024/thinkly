import JSZip from "jszip";
import { BACKUP_LIMITS, MANIFEST_PATH, fail, type LocalNotebookBackupFs } from "./contract";
import { checkedRoot } from "./paths";
import { readBackupSnapshot, assertSnapshotUnchanged } from "./snapshot";
import { validateBackupFiles } from "./validate";
import { createManifest } from "./manifest";

export async function createLocalNotebookBackup(root: string, fs: LocalNotebookBackupFs): Promise<Blob> {
  root = await checkedRoot(root, fs);
  const files = await readBackupSnapshot(root, fs);
  const notebookId = await validateBackupFiles(files);
  const manifest = await createManifest(files, notebookId);
  const manifestText = JSON.stringify(manifest);
  if ([...files.values()].reduce((sum, bytes) => sum + bytes.length, new TextEncoder().encode(manifestText).length) > BACKUP_LIMITS.totalBytes) fail("Backup exceeds extraction budget");
  const zip = new JSZip();
  for (const [name, bytes] of files) zip.file(name, bytes, { createFolders: false });
  zip.file(MANIFEST_PATH, manifestText, { createFolders: false });
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  if (bytes.length > BACKUP_LIMITS.archiveBytes) fail("Backup archive is too large");
  await assertSnapshotUnchanged(root, files, fs);
  return new Blob([new Uint8Array(bytes)], { type: "application/zip" });
}
