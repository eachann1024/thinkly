import { parseNotebookMarker } from "@/lib/notebook-marker";
import { readIdentity } from "@/lib/note-metadata/identity";
import { metadataPath, readMetadataEnvelope } from "@/lib/note-metadata/storage";
import { hydrateNoteMetadata } from "@/lib/note-metadata/restore";
import { parseHistoryMeta, isSafeVersionId } from "@/lib/history/layout";
import { normalizeHistoryVersion } from "@/lib/history/guards";
import { historyHash, validHistoryRelativePath } from "@/lib/history/localPaths";
import { decodeText, fail, type BackupFiles } from "./contract";
import { isBackupFilePath } from "./paths";

export async function validateBackupFiles(files: BackupFiles): Promise<string> {
  for (const name of files.keys()) if (!isBackupFilePath(name)) fail("Unsupported backup file");
  const marker = files.get(".goose/notebook.json");
  if (!marker) fail("Notebook identity marker is missing");
  const notebookId = parseNotebookMarker(decodeText(marker)).id;
  const root = "/backup";
  const fs = {
    existsAsync: async (file: string) => files.has(file.slice(root.length + 1)),
    readDirAsync: async (directory: string) => {
      const prefix = `${directory.slice(root.length + 1)}/`;
      return [...files.keys()].filter(name => name.startsWith(prefix) && !name.slice(prefix.length).includes("/"))
        .map(name => ({ name: name.slice(prefix.length) }));
    },
    readFileAsync: async (file: string) => {
    const bytes = files.get(file.slice(root.length + 1));
    if (!bytes) throw new Error("ENOENT");
    return decodeText(bytes);
  } };
  const noteIds = new Set<string>();
  for (const [name, bytes] of files) {
    if (name.startsWith(".goose/metadata/")) {
      const raw = JSON.parse(decodeText(bytes));
      if (!raw || typeof raw.noteId !== "string" || await metadataPath(root, raw.noteId) !== `${root}/${name}`) fail("Metadata filename identity differs");
      await readMetadataEnvelope(fs, root, raw.noteId);
    } else if (/\.(?:md|markdown)$/i.test(name)) {
      const markdown = decodeText(bytes);
      const id = readIdentity(markdown);
      if (id && noteIds.has(id)) fail("Duplicate note identities");
      if (id) noteIds.add(id);
      const hydrated = await hydrateNoteMetadata(fs, root, markdown, `${root}/${name}`);
      if (hydrated.noteId && hydrated.noteId !== id) {
        if (noteIds.has(hydrated.noteId)) fail("Duplicate note identities");
        noteIds.add(hydrated.noteId);
      }
    }
  }
  validateHistory(files);
  return notebookId;
}

function validateHistory(files: BackupFiles): void {
  const directories = new Set([...files.keys()].filter((name) => name.startsWith(".goose/history/"))
    .map((name) => name.slice(0, name.lastIndexOf("/"))));
  for (const dir of directories) {
    const bytes = files.get(`${dir}/meta.json`);
    if (!bytes) fail("History index is missing");
    const raw = JSON.parse(decodeText(bytes));
    const meta = parseHistoryMeta(decodeText(bytes));
    const folder = dir.split("/").at(-1)!;
    if (raw.version !== 2 || !folder.startsWith(historyHash(meta.pageId)) || !Array.isArray(raw.versions)
      || raw.versions.length !== meta.versions.length || raw.relativePath !== null && !validHistoryRelativePath(raw.relativePath)
      || !Array.isArray(raw.previousPaths) || raw.previousPaths.some((value: unknown) => !validHistoryRelativePath(value))) fail("Invalid history index");
    const ids = new Set<string>();
    for (const entry of meta.versions) {
      if (!isSafeVersionId(entry.versionId) || ids.has(entry.versionId) || !files.has(`${dir}/${entry.versionId}.json`)) fail("History version is missing or duplicated");
      ids.add(entry.versionId);
    }
    for (const [name, content] of files) {
      if (!name.startsWith(`${dir}/`) || name === `${dir}/meta.json`) continue;
      const versionId = name.slice(dir.length + 1, -5);
      const version = JSON.parse(decodeText(content));
      if (!isSafeVersionId(versionId) || !Array.isArray(version.content)
        || !normalizeHistoryVersion(version, meta.pageId, versionId)) fail("Invalid history version");
    }
  }
}
