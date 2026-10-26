import type { Page } from "@/types";
import type { LocalPageIdMap } from "@/lib/local-page-idmap";
import { canonicalRelativePath } from "@/lib/canonicalLocalPath";

const duplicateMessage = "检测到重复的笔记 ID，已阻止覆盖；请使用应用内复制创建独立副本";

export function isolateNoteIdentity(page: Page, occupied: ReadonlySet<string>): void {
  const base = `metadata-conflict:${page.workspaceId}:${encodeURIComponent(page.localFilePath ?? page.id)}`;
  let identity = base;
  for (let suffix = 2; occupied.has(identity); suffix++) identity = `${base}:${suffix}`;
  page.id = identity;
  page.localReadState = "error";
  page.localReadError = duplicateMessage;
}

export function protectCommittedNoteIdentities(pages: Page[], occupied: ReadonlySet<string>): Page[] {
  const claimed = new Set(occupied);
  const remapped = new Map<string, string>();
  const result = pages.map((source) => {
    const page = { ...source };
    if (claimed.has(page.id)) {
      isolateNoteIdentity(page, claimed);
      remapped.set(source.id, page.id);
    }
    claimed.add(page.id);
    return page;
  });
  return result.map(page => page.parentId && remapped.has(page.parentId)
    ? { ...page, parentId: remapped.get(page.parentId) } : page);
}

export function createNoteIdentityResolver(
  root: string, notebookId: string, fs: GooseFs, idMap: LocalPageIdMap,
  reservedIds: ReadonlySet<string> = new Set(),
) {
  const claimed = new Map<string, string>();
  const allocated = new Map<string, string>();
  const previousOwners = new Map(Object.entries(idMap).map(([path, id]) => [id, path]));
  const resolve = async (page: Page): Promise<boolean> => {
    const identity = page.localMetadataId ?? page.id;
    const relative = page.localFilePath && canonicalRelativePath(root, page.localFilePath);
    if (!relative) return false;
    const owner = claimed.get(identity) ?? allocated.get(identity);
    const previous = previousOwners.get(identity);
    const previousStillExists = previous && previous !== relative
      ? fs.existsAsync ? await fs.existsAsync(`${root}/${previous}`) : fs.exists(`${root}/${previous}`)
      : false;
    if (reservedIds.has(identity) || owner && owner !== relative || previousStillExists) {
      isolateNoteIdentity(page, new Set([...reservedIds, ...claimed.keys(), ...allocated.keys()]));
      claimed.set(page.id, relative);
      return false;
    }
    claimed.set(identity, relative);
    page.id = identity;
    if (!page.localMetadataId || idMap[relative] === identity) return false;
    if (previous && previous !== relative) delete idMap[previous];
    idMap[relative] = identity;
    return true;
  };
  return Object.assign(resolve, {
    reserve(relative: string, id: string) { allocated.set(id, relative); },
  });
}
