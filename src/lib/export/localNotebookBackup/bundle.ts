import JSZip from "jszip";
import { BACKUP_LIMITS, MANIFEST_PATH, decodeText, fail, type BackupFiles, type LocalNotebookBackupFs } from "./contract";
import { createLocalNotebookBackup } from "./create";
import { readBackupArchive } from "./archive";
import { readValidatedNotebookBackup } from "./restore";
import { assertSnapshotUnchanged } from "./snapshot";
import { readIdentity } from "@/lib/note-metadata/identity";

export const BUNDLE_PATH = "thinkly-local-backups.json";
export type BackupNotebook = { name: string; notebookId: string; files: BackupFiles };
type BundleIndex = { format: "thinkly-local-notebooks"; version: 1; notebooks: { name: string; path: string }[] };

export async function createLocalNotebookBundle(notebooks: { name: string; root: string }[], fs: LocalNotebookBackupFs): Promise<Blob> {
  if (!notebooks.length || notebooks.length > 64) fail("Invalid notebook selection");
  const zip = new JSZip();
  const index: BundleIndex = { format: "thinkly-local-notebooks", version: 1, notebooks: [] };
  let total = 0;
  let fileCount = 0;
  const ids = new Set<string>();
  const snapshots: BackupFiles[] = [];
  const noteIds = new Set<string>();
  for (let number = 0; number < notebooks.length; number++) {
    const notebook = notebooks[number];
    if (!notebook.name.trim() || notebook.name.length > 200 || /[\u0000-\u001f]/.test(notebook.name)) fail("Invalid notebook name");
    const blob = await createLocalNotebookBackup(notebook.root, fs);
    if (blob.size > BACKUP_LIMITS.fileBytes) fail("Bundled notebook archive is too large");
    const validated = await readValidatedNotebookBackup(blob);
    assertUniqueNoteIds(validated.files, noteIds);
    snapshots.push(validated.files);
    fileCount += validated.files.size;
    if (fileCount > BACKUP_LIMITS.entries) fail("Too many bundled files");
    if (ids.has(validated.notebookId)) fail("Notebook identities are duplicated");
    ids.add(validated.notebookId);
    total += [...validated.files.values()].reduce((sum, bytes) => sum + bytes.length, 0);
    if (total > BACKUP_LIMITS.totalBytes) fail("Notebook bundle exceeds extraction budget");
    const file = `notebooks/${number}.zip`;
    index.notebooks.push({ name: notebook.name, path: file });
    zip.file(file, await blob.arrayBuffer(), { createFolders: false });
  }
  zip.file(BUNDLE_PATH, JSON.stringify(index), { createFolders: false });
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
  if (bytes.length > BACKUP_LIMITS.archiveBytes) fail("Notebook bundle is too large");
  for (let number = 0; number < notebooks.length; number++) await assertSnapshotUnchanged(notebooks[number].root, snapshots[number], fs);
  return new Blob([new Uint8Array(bytes)], { type: "application/zip" });
}

export async function readLocalNotebookBundle(blob: Blob): Promise<BackupNotebook[]> {
  const outer = await readBackupArchive(blob);
  if (outer.has(MANIFEST_PATH)) {
    const notebook = await readValidatedNotebookBackup(blob);
    return [{ name: notebook.notebookId, ...notebook }];
  }
  const raw = outer.get(BUNDLE_PATH);
  if (!raw || raw.length > 1024 * 1024) fail("Local notebook bundle index is missing");
  const index = JSON.parse(decodeText(raw)) as BundleIndex;
  if (index.format !== "thinkly-local-notebooks" || index.version !== 1 || !Array.isArray(index.notebooks)
    || !index.notebooks.length || index.notebooks.length > 64 || outer.size !== index.notebooks.length + 1) fail("Invalid notebook bundle");
  const notebooks: BackupNotebook[] = [];
  const paths = new Set<string>();
  const ids = new Set<string>();
  const noteIds = new Set<string>();
  let total = 0;
  let fileCount = 0;
  for (const entry of index.notebooks) {
    if (!entry || typeof entry.name !== "string" || !entry.name.trim() || entry.name.length > 200
      || /[\u0000-\u001f]/.test(entry.name) || typeof entry.path !== "string" || !/^notebooks\/\d+\.zip$/.test(entry.path)
      || paths.has(entry.path) || !outer.has(entry.path)) fail("Invalid bundled notebook");
    paths.add(entry.path);
    const notebook = await readValidatedNotebookBackup(new Blob([new Uint8Array(outer.get(entry.path)!)]));
    assertUniqueNoteIds(notebook.files, noteIds);
    if (ids.has(notebook.notebookId)) fail("Notebook identities are duplicated");
    ids.add(notebook.notebookId);
    fileCount += notebook.files.size;
    if (fileCount > BACKUP_LIMITS.entries) fail("Too many bundled files");
    total += [...notebook.files.values()].reduce((sum, bytes) => sum + bytes.length, 0);
    if (total > BACKUP_LIMITS.totalBytes) fail("Notebook bundle exceeds extraction budget");
    notebooks.push({ name: entry.name, ...notebook });
  }
  return notebooks;
}

function assertUniqueNoteIds(files: BackupFiles, ids: Set<string>): void {
  for (const [name, bytes] of files) {
    if (!/\.(?:md|markdown)$/i.test(name)) continue;
    const id = readIdentity(decodeText(bytes));
    if (!id) continue;
    if (ids.has(id)) fail("Note identities overlap between notebooks");
    ids.add(id);
  }
}
