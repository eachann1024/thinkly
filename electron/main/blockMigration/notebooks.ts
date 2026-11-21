import { app, BrowserWindow } from "electron";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

type StoredNotebook = { localPath?: unknown; source?: unknown; order?: unknown; createdAt?: unknown };
type StoredState = { state?: { notebooks?: Record<string, StoredNotebook>; activeNotebookId?: unknown } };
export type NotebookSnapshot = { notebooks: string[]; active: string | null };

const isFolder = (target: string) => {
  try { return statSync(target).isDirectory(); } catch { return false; }
};

const unique = (paths: string[]) => [...new Set(paths.map((entry) => path.resolve(entry)))].filter(isFolder);

async function readStoredNotebooks(page: string): Promise<string | null> {
  const win = new BrowserWindow({
    show: false, width: 1, height: 1,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  try {
    await win.loadFile(page);
    const raw: unknown = await win.webContents.executeJavaScript(`localStorage.getItem("thinkly-notebooks")`, true);
    return typeof raw === "string" ? raw : null;
  } catch {
    return null;
  } finally {
    win.destroy();
  }
}

export function parseNotebooks(raw: string | null): NotebookSnapshot {
  let stored: StoredState;
  try { stored = raw ? JSON.parse(raw) as StoredState : {}; } catch { stored = {}; }
  const entries = Object.entries(stored.state?.notebooks ?? {}).filter(([, notebook]) =>
    notebook && notebook.source === "local-folder" && typeof notebook.localPath === "string" && notebook.localPath.trim());
  const rank = (notebook: StoredNotebook) => Number(notebook.order ?? notebook.createdAt ?? 0) || 0;
  entries.sort(([, a], [, b]) => rank(a) - rank(b));
  const notebooks = unique(entries.map(([, notebook]) => notebook.localPath as string));
  const activeId = stored.state?.activeNotebookId;
  const activeEntry = entries.find(([id]) => id === activeId)?.[1];
  const activePath = typeof activeEntry?.localPath === "string" ? path.resolve(activeEntry.localPath) : null;
  return { notebooks, active: activePath && notebooks.includes(activePath) ? activePath : notebooks[0] ?? null };
}

function readVaultRoots(): string[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path.join(app.getPath("userData"), "vault-roots.json"), "utf8"));
    return Array.isArray(parsed) ? unique(parsed.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))) : [];
  } catch {
    return [];
  }
}

export async function collectNotebooks(page: string): Promise<NotebookSnapshot> {
  const snapshot = parseNotebooks(await readStoredNotebooks(page));
  if (snapshot.notebooks.length) return snapshot;
  const roots = readVaultRoots();
  return { notebooks: roots, active: roots[0] ?? null };
}

function preferredLanguage(): "zh" | "en" | null {
  try {
    const parsed = JSON.parse(readFileSync(path.join(app.getPath("userData"), "language-preference.json"), "utf8")) as { preference?: unknown };
    const preference = typeof parsed.preference === "string" ? parsed.preference.toLowerCase() : "";
    if (preference.startsWith("zh")) return "zh";
    if (preference.startsWith("en")) return "en";
    return null;
  } catch {
    return null;
  }
}

export const blockDataDir = () => process.env.BLOCK_DATA_DIR?.trim()
  ? path.resolve(process.env.BLOCK_DATA_DIR.trim())
  : path.join(app.getPath("appData"), "Block");

export function writeBlockState(snapshot: NotebookSnapshot): void {
  const directory = blockDataDir();
  const target = path.join(directory, "state.json");
  if (existsSync(target)) return;
  const language = preferredLanguage();
  const state: Record<string, unknown> = {};
  if (snapshot.active) state.folder = snapshot.active;
  if (snapshot.notebooks.length) state.notebooks = snapshot.notebooks;
  if (language) state.language = language;
  mkdirSync(directory, { recursive: true });
  const temporary = `${target}.thinkly-${process.pid}`;
  writeFileSync(temporary, JSON.stringify(state, null, 2), { mode: 0o600 });
  renameSync(temporary, target);
}
