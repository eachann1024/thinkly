import { createTranslator, i18nYaml } from "@/i18n/core";
import type { StoreGet, StoreSet } from "../hydrate";
import { recordRecoveryEntry } from "@/lib/storage/recoveryJournal";
import { notifyRecoveryDrafts } from "@/lib/recoveryDraftNotice";
import { queueLocalPageSave } from "../../folderSync";
import { useNotebooks } from "../../../useNotebooks";
import { allocateLocalMarkdownFilePath } from "./localPaths";
import { readLocalPageIdMap, toRelativePath, writeLocalPageIdMap } from "@/lib/local-page-idmap";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { validateEditorDraftTarget } from "./validateEditorDraftTarget";

const text = createTranslator(i18nYaml<"src/stores/pages/actions/create/recovery.ts#block1:1">`
zh-Hans:
  draftPreserved: "未写盘的本地笔记已保留"
  draftDescription: "内容仍在编辑器中，也可从恢复稿列表找回。"
en:
  draftPreserved: "The unsaved local note was preserved"
  draftDescription: "It remains in the editor and is also available in recovery drafts."
ja:
  draftPreserved: "未保存のローカルノートを保持しました"
  draftDescription: "編集画面に残っており、復元用下書き一覧からも取得できます。"
`);

const MISSING_FILE_SIGNATURE = "__thinkly_missing_local_file__";

export function preserveLocalEditorDraft(
  set: StoreSet,
  get: StoreGet,
  pageId: string,
  targetPath?: string,
): boolean {
  const current = get().pages[pageId];
  if (!current || current.trashedAt) return false;
  const draft = {
    ...current,
    editorDraft: true,
    localUnsaved: true,
    ...(targetPath ? { localFilePath: targetPath } : {}),
  };
  set((state) => state.pages[pageId] === current ? {
    pages: { ...state.pages, [pageId]: draft },
    dirtyLocalPageIds: { ...state.dirtyLocalPageIds, [pageId]: true },
  } : state);
  const latest = get().pages[pageId];
  if (!latest) return false;
  let entry: ReturnType<typeof recordRecoveryEntry>;
  try {
    entry = recordRecoveryEntry({
      source: "local-file",
      id: pageId,
      content: latest.content,
      baseSignature: MISSING_FILE_SIGNATURE,
      draftPage: latest,
    });
  } catch {
    entry = null;
  }
  if (entry) {
    notifyRecoveryDrafts(text("draftPreserved"), text("draftDescription"), `goose-local-create-recovery:${pageId}`);
  }
  queueLocalPageSave(pageId, latest.content, get, entry?.revision);
  return Boolean(entry);
}

export async function reassignEditorDraftTarget(
  set: StoreSet,
  get: StoreGet,
  pageId: string,
): Promise<string | null> {
  const page = get().pages[pageId];
  if (!page?.editorDraft || !page.localFilePath || page.trashedAt) return null;
  const notebook = useNotebooks.getState().notebooks[page.workspaceId];
  if (!notebook?.localPath) return null;

  const oldPath = page.localFilePath;
  const stillSameTarget = (current: typeof page | undefined) => Boolean(
    current && !current.trashedAt && current.editorDraft &&
    current.workspaceId === page.workspaceId &&
    current.parentId === page.parentId &&
    current.localFilePath === oldPath,
  );
  await validateEditorDraftTarget(get, pageId, oldPath);
  if (!stillSameTarget(get().pages[pageId])) return null;
  const oldRelative = toRelativePath(notebook.localPath, oldPath);
  const baseTitle = getPageTitle(page);
  let nextPath: string | null = null;
  let nextRelative = "";
  for (let suffix = 0; suffix < 100; suffix++) {
    const title = suffix === 0 ? baseTitle : `${baseTitle} recovery ${suffix}`;
    const candidate = await allocateLocalMarkdownFilePath(
      get, page.workspaceId, page.parentId, title,
    );
    if (!stillSameTarget(get().pages[pageId])) return null;
    if (!candidate || candidate === oldPath) continue;
    const relative = toRelativePath(notebook.localPath, candidate);
    await validateEditorDraftTarget(get, pageId, candidate);
    if (!stillSameTarget(get().pages[pageId])) return null;
    const idMap = readLocalPageIdMap(page.workspaceId);
    if (idMap[relative] && idMap[relative] !== pageId) continue;
    nextPath = candidate;
    nextRelative = relative;
    break;
  }
  if (!nextPath) return null;
  const liveBeforeAssign = get().pages[pageId];
  if (!stillSameTarget(liveBeforeAssign)) return null;
  let assigned = false;
  set((state) => {
    const current = state.pages[pageId];
    if (!stillSameTarget(current)) return state;
    assigned = true;
    return {
      pages: { ...state.pages, [pageId]: { ...current, localFilePath: nextPath } },
    };
  });
  if (!assigned) return null;
  const latest = get().pages[pageId];
  if (!latest || latest.localFilePath !== nextPath || !latest.editorDraft) return null;
  const idMap = readLocalPageIdMap(latest.workspaceId);
  if (idMap[nextRelative] && idMap[nextRelative] !== pageId) {
    set((state) => state.pages[pageId]?.localFilePath === nextPath
      ? { pages: { ...state.pages, [pageId]: { ...state.pages[pageId], localFilePath: oldPath } } }
      : state);
    return null;
  }
  if (idMap[oldRelative] === pageId) delete idMap[oldRelative];
  idMap[nextRelative] = pageId;
  try {
    writeLocalPageIdMap(latest.workspaceId, idMap);
  } catch (error) {
    set((state) => state.pages[pageId]?.localFilePath === nextPath
      ? { pages: { ...state.pages, [pageId]: { ...state.pages[pageId], localFilePath: oldPath } } }
      : state);
    throw error;
  }
  const currentDraft = get().pages[pageId];
  if (!currentDraft || currentDraft.localFilePath !== nextPath || !currentDraft.editorDraft) return null;
  let entry: ReturnType<typeof recordRecoveryEntry>;
  try {
    entry = recordRecoveryEntry({
      source: "local-file",
      id: pageId,
      content: currentDraft.content,
      baseSignature: MISSING_FILE_SIGNATURE,
      draftPage: currentDraft,
    });
  } catch {
    entry = null;
  }
  queueLocalPageSave(pageId, currentDraft.content, get, entry?.revision);
  return nextPath;
}
