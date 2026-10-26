import { getGooseDesktop } from "@/lib/electron/runtime";
import { parseNotebookMarker } from "@/lib/notebook-marker";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { fail, type BackupFiles, type LocalNotebookBackupFs } from "./contract";
import { readLocalNotebookBundle, createLocalNotebookBundle, type BackupNotebook } from "./bundle";
import { restoreValidatedBackupFiles } from "./restore";
import { comparisonLocalPath, localPathsAreCaseInsensitive } from "@/lib/canonicalLocalPath";

export function localBackupFs(): LocalNotebookBackupFs {
  const fs = typeof window !== "undefined" ? window.gooseFs : undefined;
  for (const key of ["readDirAsync", "readFileBase64Async", "readFileAsync", "writeFileAsync", "createFileAsync",
    "existsAsync", "realpathAsync", "mkdir", "deleteFile", "deleteDir"] as const) {
    if (!fs || typeof fs[key] !== "function") fail("This host cannot safely back up local notebooks");
  }
  return fs as LocalNotebookBackupFs;
}

export async function exportLocalNotebooks(notebooks: { name: string; localPath?: string }[]): Promise<Blob> {
  if (notebooks.some((notebook) => !notebook.localPath)) fail("Export local and legacy notebooks separately");
  window.dispatchEvent(new CustomEvent("goose-note:flush-editor", { detail: { immediate: true } }));
  await usePages.getState().flushPendingLocalSaves();
  return createLocalNotebookBundle(notebooks.map((notebook) => ({ name: notebook.name, root: notebook.localPath! })), localBackupFs());
}

async function assertNoRegisteredIdentity(notebooks: BackupNotebook[], fs: LocalNotebookBackupFs): Promise<void> {
  const ids = new Set(notebooks.map((notebook) => notebook.notebookId));
  for (const existing of Object.values(useNotebooks.getState().notebooks)) {
    if (ids.has(existing.portableNotebookId || existing.id)) fail("A notebook with this portable identity is already registered");
    if (existing.source === "local-folder" && existing.localPath) {
      const marker = `${existing.localPath.replace(/[\\/]+$/, "")}/.goose/notebook.json`;
      if (await fs.existsAsync(marker)) {
        const raw = await fs.readFileAsync(marker);
        if (raw === null) fail("Cannot verify registered notebook identity");
        if (ids.has(parseNotebookMarker(raw).id)) fail("A notebook with this portable identity is already registered");
      }
    }
  }
}

export async function importLocalNotebooks(blob: Blob): Promise<{ notebooks: number; pages: number } | null> {
  const notebooks = await readLocalNotebookBundle(blob);
  const fs = localBackupFs();
  await assertNoRegisteredIdentity(notebooks, fs);
  const desktop = getGooseDesktop();
  const selected = desktop ? await desktop.selectDirectory({ purpose: "recovery" }) : await window.gooseFs?.selectDirectory?.();
  if (!selected) return null;
  const root = selected.replace(/\\/g, "/").replace(/\/+$/, "");
  const compare = (value: string) => comparisonLocalPath(value, localPathsAreCaseInsensitive());
  if (Object.values(useNotebooks.getState().notebooks).some((notebook) => notebook.localPath
    && (compare(root) === compare(notebook.localPath) || compare(root).startsWith(`${compare(notebook.localPath)}/`)
      || compare(notebook.localPath).startsWith(`${compare(root)}/`)))) fail("Restore target overlaps a registered notebook");
  const files: BackupFiles = new Map();
  const roots = notebooks.map((notebook, index) => {
    const prefix = notebooks.length === 1 ? "" : `notebook-${index + 1}/`;
    for (const [name, bytes] of notebook.files) files.set(`${prefix}${name}`, bytes);
    return `${root}${prefix ? `/${prefix.slice(0, -1)}` : ""}`;
  });
  await assertNoRegisteredIdentity(notebooks, fs);
  await restoreValidatedBackupFiles(files, root, fs);
  await assertNoRegisteredIdentity(notebooks, fs);
  const store = useNotebooks.getState();
  const created: string[] = [];
  for (let index = 0; index < notebooks.length; index++) {
    const notebook = notebooks[index];
    const id = store.createLocalFolderNotebook(notebook.name, roots[index]);
    store.updateNotebook(id, { portableNotebookId: notebook.notebookId });
    created.push(id);
  }
  for (let index = 0; index < created.length; index++) await usePages.getState().loadLocalFolderPages(created[index], roots[index]);
  if (created[0]) store.setActiveNotebook(created[0]);
  return { notebooks: created.length, pages: notebooks.reduce((sum, notebook) => sum
    + [...notebook.files.keys()].filter((name) => /\.(md|markdown)$/i.test(name)).length, 0) };
}
