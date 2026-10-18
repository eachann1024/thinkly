const EXACT_KEYS = [
  ["goose-note-settings", "thinkly-settings"],
  ["goose-note:quicknote", "thinkly:quicknote"],
  ["goose-note-reflection", "thinkly-reflection"],
  ["goose-note-notebooks", "thinkly-notebooks"],
  ["goose-note-notebook-ai-chats", "thinkly-notebook-ai-chats"],
  ["goose-note:quicknote-slot-names", "thinkly:quicknote-slot-names"],
  ["goose-note:recovery-journal:v1", "thinkly:recovery-journal:v1"],
  ["goose-recent-excludes", "thinkly-recent-excludes"],
  ["goose-note-ai-panel-open", "thinkly-ai-panel-open"],
  ["goose-note-ai-panel-width", "thinkly-ai-panel-width"],
  ["goose-note-ai-layout-mode", "thinkly-ai-layout-mode"],
  ["goose-note:web-db", "thinkly:web-db"],
  ["goose-note-pages-meta", "thinkly-pages-meta"],
  ["goose-sidebar-view", "thinkly-sidebar-view"],
  ["goose-ai-runtime", "thinkly-ai-runtime"],
  ["goose-note:electron-last-directory", "thinkly:electron-last-directory"],
  ["goose-note:last-format-colors", "thinkly:last-format-colors"],
] as const;

const PREFIXES = [
  ["goose-note:open-tabs:v1", "thinkly:open-tabs:v1"],
  ["goose-note:web-att:", "thinkly:web-att:"],
  ["goose-note:editor-split:v1", "thinkly:editor-split:v1"],
] as const;

function copyKey(from: string, to: string): void {
  if (localStorage.getItem(to) != null) return;
  const value = localStorage.getItem(from);
  if (value == null) return;
  localStorage.setItem(to, value);
  localStorage.removeItem(from);
}

/** 把已保存的 goose-note 键抄到 thinkly，避免改名后设置、标签和附件消失。 */
export function migrateStorageNames(): void {
  if (typeof localStorage === "undefined") return;
  for (const [from, to] of EXACT_KEYS) copyKey(from, to);
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    for (const [from, to] of PREFIXES) {
      if (key.startsWith(from)) copyKey(key, to + key.slice(from.length));
    }
  }
}
