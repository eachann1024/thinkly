import { canonicalRelativePath } from "@/lib/canonicalLocalPath";
import { markSelfWrite, setLocalMdSnapshot } from "@/lib/local-md-snapshot";
import type { BatchPlanJournal } from "@/lib/notebook-ai/batch-plan/types";
import { usePages } from "@/stores/usePages";

const BATCH_JOURNAL_PREFIX = "gn:notebook-ai:batch-plan:";

export function rebaseRootPath(filePath: string, oldRoot: string, newRoot: string): string {
  const relative = canonicalRelativePath(oldRoot, filePath);
  if (relative === null) return filePath;
  const next = newRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  return relative ? `${next}/${relative}` : next;
}

function fileUrlToPath(value: string): string | null {
  if (!/^file:/i.test(value)) return null;
  try {
    const url = new URL(value);
    let pathname = decodeURIComponent(url.pathname);
    if (/^\/[A-Za-z]:[\\/]/.test(pathname)) pathname = pathname.slice(1);
    return url.host ? null : pathname;
  } catch {
    return null;
  }
}

function pathToFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  return `file://${encodeURI(normalized)}`;
}

export function rebaseAbsolutePathString(value: string, oldRoot: string, newRoot: string): string {
  const fromFileUrl = fileUrlToPath(value);
  const target = fromFileUrl ?? value;
  const next = rebaseRootPath(target, oldRoot, newRoot);
  if (next === target) return value;
  return fromFileUrl ? pathToFileUrl(next) : next;
}

function rebaseJsonValue(value: unknown, oldRoot: string, newRoot: string): unknown {
  if (typeof value === "string") return rebaseAbsolutePathString(value, oldRoot, newRoot);
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((entry) => {
      const rebased = rebaseJsonValue(entry, oldRoot, newRoot);
      if (rebased !== entry) changed = true;
      return rebased;
    });
    return changed ? next : value;
  }
  if (value && typeof value === "object") {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      const rebased = rebaseJsonValue(entry, oldRoot, newRoot);
      if (rebased !== entry) changed = true;
      next[key] = rebased;
    }
    return changed ? next : value;
  }
  return value;
}

function rewriteMarkdownUrls(text: string, oldRoot: string, newRoot: string): string {
  const swap = (url: string) => rebaseAbsolutePathString(url, oldRoot, newRoot);
  const wrapped = (url: string) => url.startsWith("<") ? `<${swap(url.slice(1, -1))}>` : swap(url);
  return text
    .replace(/(!?\[[^\]\n]*\]\(\s*)(<[^>\n]+>|[^)\s]+)([^\n]*?\))/g, (_all, start: string, url: string, end: string) => `${start}${wrapped(url)}${end}`)
    .replace(/(\b(?:src|href)\s*=\s*["'])([^"']+)(["'])/gi, (_all, start: string, url: string, end: string) => `${start}${swap(url)}${end}`)
    .replace(/(^ {0,3}\[[^\]\n]+\]:\s*)(<[^>\n]+>|\S+)/gm, (_all, start: string, url: string) => `${start}${wrapped(url)}`);
}

export function rebaseMarkdownAbsolutePaths(markdown: string, oldRoot: string, newRoot: string): string {
  return markdown.split("\n").map((line) => line.split(/(`+[^`\n]*`+)/).map((part) => part.startsWith("`") ? part : rewriteMarkdownUrls(part, oldRoot, newRoot)).join("")).join("\n");
}

export function rebaseBatchPlanJournals(notebookId: string, oldRoot: string, newRoot: string): void {
  if (typeof window === "undefined") return;
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(BATCH_JOURNAL_PREFIX)) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      const journal = JSON.parse(raw) as BatchPlanJournal;
      if (journal.notebookId !== notebookId) continue;
      const next = rebaseJsonValue(journal, oldRoot, newRoot);
      const serialized = JSON.stringify(next);
      if (serialized !== raw) window.localStorage.setItem(key, serialized);
    } catch {
    }
  }
}

export async function rebaseNotebookFileReferences(notebookId: string, oldRoot: string, newRoot: string): Promise<void> {
  const fs = window.gooseFs;
  const pages = Object.values(usePages.getState().pages).filter((page) => page.workspaceId === notebookId && page.localFilePath && !page.isFolder);
  for (const page of pages) {
    const content = rebaseJsonValue(page.content, oldRoot, newRoot);
    if (content !== page.content) {
      usePages.setState((state) => {
        const current = state.pages[page.id];
        return current ? { pages: { ...state.pages, [page.id]: { ...current, content: content as typeof current.content } } } : state;
      });
    }
    const filePath = usePages.getState().pages[page.id]?.localFilePath;
    if (!fs || !filePath || !/\.(md|markdown)$/i.test(filePath)) continue;
    const disk = fs.readFileAsync ? await fs.readFileAsync(filePath) : fs.readFile(filePath);
    if (disk == null) continue;
    const rewritten = rebaseMarkdownAbsolutePaths(disk, oldRoot, newRoot);
    if (rewritten === disk) continue;
    markSelfWrite(filePath);
    const wrote = fs.writeFileAsync ? await fs.writeFileAsync(filePath, rewritten) : fs.writeFile(filePath, rewritten);
    if (wrote) setLocalMdSnapshot(filePath, rewritten);
  }
}

export async function stampNotebookMarker(notebookId: string, root: string): Promise<void> {
  const fs = window.gooseFs;
  if (!fs) return;
  const directory = `${root.replace(/[\\/]+$/, "")}/.goose`;
  const file = `${directory}/notebook.json`;
  const current = fs.readFileAsync ? await fs.readFileAsync(file) : fs.readFile(file);
  let historyLayout: unknown;
  try { historyLayout = current ? JSON.parse(current).historyLayout : undefined; } catch {   }
  const next = `${JSON.stringify({ id: notebookId, ...(historyLayout === undefined ? {} : { historyLayout }) })}\n`;
  if (current === next) return;
  await fs.mkdir(directory);
  if (fs.writeFileAsync) await fs.writeFileAsync(file, next);
  else fs.writeFile(file, next);
}
