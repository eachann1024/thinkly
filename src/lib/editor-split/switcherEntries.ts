export const SPLIT_SWITCHER_ROOT_ORDER_KEY = "root";

export type SplitSwitcherPage = {
  id: string;
  workspaceId: string;
  parentId?: string | null;
  isFolder?: boolean;
  trashedAt?: number;
  editorDraft?: boolean;
  localUnsaved?: boolean;
  localPendingCreate?: boolean;
  order?: number;
  createdAt: number;
  title: string;
};

export type SplitSwitcherEntry = {
  id: string;
  title: string;
  isFolder: boolean;
  children: SplitSwitcherEntry[];
};

export type SplitSwitcherScope = "siblings" | "notebook-root";

export type SplitSwitcherOptions = {
  localFolder?: boolean;
  manualOrders?: Record<string, string[]>;
};

function parentKey(parentId: string | null | undefined): string {
  return parentId ? parentId : "";
}

function isListed(page: SplitSwitcherPage): boolean {
  return !page.trashedAt && !page.editorDraft && !page.localUnsaved;
}

function comparePages(
  a: SplitSwitcherPage,
  b: SplitSwitcherPage,
  localFolder: boolean,
  rank: Map<string, number> | null,
): number {
  if (!!a.localPendingCreate !== !!b.localPendingCreate) {
    return a.localPendingCreate ? -1 : 1;
  }
  if (rank) {
    const unknown = rank.size;
    const delta = (rank.get(a.id) ?? unknown) - (rank.get(b.id) ?? unknown);
    if (delta !== 0) return delta;
  } else if (localFolder && !!a.isFolder !== !!b.isFolder) {
    return a.isFolder ? -1 : 1;
  } else if (!localFolder) {
    const delta = (a.order ?? a.createdAt) - (b.order ?? b.createdAt);
    if (delta !== 0) return delta;
    return a.id.localeCompare(b.id);
  }
  const byTitle = a.title.localeCompare(b.title, "zh-CN", { numeric: true });
  return byTitle !== 0 ? byTitle : a.id.localeCompare(b.id);
}

export function splitSwitcherEntries(
  pages: readonly SplitSwitcherPage[],
  current: { workspaceId: string; parentId?: string | null },
  scope: SplitSwitcherScope,
  options: SplitSwitcherOptions = {},
): SplitSwitcherEntry[] {
  const localFolder = options.localFolder ?? false;
  const byParent = new Map<string, SplitSwitcherPage[]>();
  for (const page of pages) {
    if (page.workspaceId !== current.workspaceId || !isListed(page)) continue;
    const key = parentKey(page.parentId);
    const list = byParent.get(key);
    if (list) list.push(page);
    else byParent.set(key, [page]);
  }

  const start = scope === "notebook-root" ? "" : parentKey(current.parentId);
  const seen = new Set<string>();
  const build = (key: string): SplitSwitcherEntry[] => {
    const manual = options.manualOrders?.[key || SPLIT_SWITCHER_ROOT_ORDER_KEY];
    const rank = manual ? new Map(manual.map((id, index) => [id, index])) : null;
    const sorted = [...(byParent.get(key) ?? [])].sort((a, b) =>
      comparePages(a, b, localFolder, rank),
    );
    const entries: SplitSwitcherEntry[] = [];
    for (const page of sorted) {
      if (seen.has(page.id)) continue;
      seen.add(page.id);
      entries.push({
        id: page.id,
        title: page.title,
        isFolder: !!page.isFolder,
        children: page.isFolder ? build(page.id) : [],
      });
    }
    return entries;
  };
  return build(start);
}
