import { BACKUP_LIMITS, MANIFEST_PATH, bytesDigest, decodeText, fail, type BackupFiles, type BackupManifest } from "./contract";
import { assertDistinctPaths } from "./paths";

export async function createManifest(files: BackupFiles, notebookId: string): Promise<BackupManifest> {
  const entries: BackupManifest["files"] = [];
  for (const [path, bytes] of files) entries.push({ path, size: bytes.length, sha256: await bytesDigest(bytes) });
  return { format: "thinkly-local-notebook", version: 1, notebookId, files: entries };
}

export async function validateManifest(files: BackupFiles): Promise<BackupManifest> {
  const bytes = files.get(MANIFEST_PATH);
  if (!bytes || bytes.length > 4 * 1024 * 1024) fail("Backup manifest is missing or too large");
  const manifest = JSON.parse(decodeText(bytes)) as BackupManifest;
  if (!manifest || manifest.format !== "thinkly-local-notebook" || manifest.version !== 1
    || typeof manifest.notebookId !== "string" || !Array.isArray(manifest.files)
    || manifest.files.length > BACKUP_LIMITS.entries || manifest.files.length !== files.size - 1) fail("Invalid backup manifest");
  const names: string[] = [];
  for (const entry of manifest.files) {
    if (!entry || typeof entry.path !== "string" || entry.path === MANIFEST_PATH
      || !Number.isSafeInteger(entry.size) || entry.size < 0 || typeof entry.sha256 !== "string"
      || !/^[a-f0-9]{64}$/.test(entry.sha256)) fail("Invalid manifest entry");
    const content = files.get(entry.path);
    if (!content || content.length !== entry.size || await bytesDigest(content) !== entry.sha256) fail("Backup file checksum differs");
    names.push(entry.path);
  }
  assertDistinctPaths(names);
  return manifest;
}
