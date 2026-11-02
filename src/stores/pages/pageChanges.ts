import type { Page } from "@/types";
import { usePages } from "@/stores/usePages";
import { sidebarPageSignature } from "./sidebarPageSignature";

type Pages = Record<string, Page>;
interface Snapshot { revision: number; sidebarRevision: number }
interface Change { revision: number; ids: string[] }
const snapshots = new WeakMap<Pages, Snapshot>();
const changes: Change[] = [];
const MAX_CHANGES = 256;
let installed = false;
let revision = 0;
let sidebarRevision = 0;
let hint: { pages: Pages; id: string } | undefined;

function diffPages(previous: Pages, next: Pages): string[] {
  const ids: string[] = [];
  for (const id in next) if (previous[id] !== next[id]) ids.push(id);
  for (const id in previous) if (!(id in next)) ids.push(id);
  return ids;
}

function record(previous: Pages, next: Pages): void {
  if (previous === next || snapshots.has(next)) return;
  // updatePage changes exactly one record synchronously. Consume the hint before
  // notifying consumers, so reentrant or bulk writes take the identity fallback.
  const currentHint = hint;
  hint = undefined;
  const ids = currentHint?.pages === previous && previous[currentHint.id] !== next[currentHint.id]
    ? [currentHint.id]
    : diffPages(previous, next);
  if (ids.some(id => !previous[id] || !next[id] ||
      sidebarPageSignature(previous[id]) !== sidebarPageSignature(next[id]))) {
    sidebarRevision++;
  }
  revision++;
  snapshots.set(next, { revision, sidebarRevision });
  changes.push({ revision, ids });
  if (changes.length > MAX_CHANGES) changes.shift();
}

function install(): void {
  if (installed) return;
  installed = true;
  snapshots.set(usePages.getState().pages, { revision, sidebarRevision });
  usePages.subscribe((state, previous) => record(previous.pages, state.pages));
  const updatePage = usePages.getState().updatePage;
  // Keep slice implementations untouched. This boundary supplies the ID missing
  // from Zustand's table notifications; all other writers still work unchanged.
  usePages.setState({ updatePage: (id, updates, options) => {
    const previousHint = hint;
    hint = { pages: usePages.getState().pages, id };
    try {
      return updatePage(id, updates, options);
    } finally {
      hint = previousHint;
    }
  } });
}

export function getPageTableSnapshot(pages: Pages): Snapshot | undefined {
  install();
  // A selector may run before our subscription in the same notification.
  const state = usePages.getState();
  if (pages === state.pages && !snapshots.has(pages) && hint) record(hint.pages, pages);
  return snapshots.get(pages);
}

export function changedPageIds(previous: Pages | null, next: Pages): string[] {
  install();
  if (previous === next) return [];
  if (!previous) return Object.keys(next);
  const before = snapshots.get(previous);
  const after = getPageTableSnapshot(next);
  if (before && after && before.revision < after.revision &&
      changes[0] && before.revision >= changes[0].revision - 1) {
    const ids = new Set<string>();
    for (const change of changes) {
      if (change.revision > before.revision && change.revision <= after.revision) {
        for (const id of change.ids) ids.add(id);
      }
    }
    return [...ids];
  }
  return diffPages(previous, next);
}
