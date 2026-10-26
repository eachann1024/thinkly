import { flushEditorContent } from "../flushEditor";
import type { StoreSet, StoreGet } from "../hydrate";
import { UNTITLED_PAGE_TITLE } from "@/components/editor/utils/page-title";
import { createEmptyLocalPageContent } from "@/components/editor/utils/blocknote-content";
import { useNotebooks } from "../../../useNotebooks";
import { focusNewPage, cloneLocalPageContent } from "./content";
import type { JSONContent, Page } from "@/types";
import { useSettings } from "@/stores/useSettings";
import { pickRandomPageIcon } from "@/lib/randomPageIcon";
import { allocateLocalMarkdownFilePath, generateLocalPageId } from "./localPaths";
import { queueLocalPageCreation } from "./localCreationQueue";
import {
  syncLocalPageMetadataCache,
  persistPageSnapshot,
} from "../../persistence";
import { markSelfWrite } from "@/lib/local-md-snapshot";
import { appendLocalFolderOrderEntries } from "@/stores/localFolderOrder";
import { preserveLocalEditorDraft } from "./recovery";

export const createLocalPageAction = async (
  set: StoreSet,
  get: StoreGet,
  parentId?: string,
  workspaceId?: string,
): Promise<string | null> => {
  if (!workspaceId) return null;
  const parent = parentId ? get().pages[parentId] : undefined;
  if (parentId && (!parent || parent.workspaceId !== workspaceId || parent.trashedAt)) return null;
  flushEditorContent();
  const id = await get().createLocalPageRecord({
    workspaceId, parentId, title: UNTITLED_PAGE_TITLE, content: createEmptyLocalPageContent(),
  });
  if (!id || !get().pages[id]) return null;
  set({ activePageId: id });
  useNotebooks.getState().setLastActivePage(workspaceId, id);
  focusNewPage(id);

  return id;
};

export const createLocalPageRecordAction = async (
  set: StoreSet,
  get: StoreGet,
  {
    workspaceId,
    parentId,
    title,
    content,
    filePath: requestedFilePath,
  }: {
    workspaceId: string;
    parentId?: string;
    title?: string;
    content?: JSONContent;
    filePath?: string;
  },
): Promise<string | null> => queueLocalPageCreation(workspaceId, async () => {
  const notebook = useNotebooks.getState().notebooks[workspaceId];
  if (
    !notebook?.localPath ||
    typeof window === "undefined" ||
    !window.gooseFs
  ) {
    return null;
  }

  const randomIcon = useSettings.getState().randomIconOnCreate
    ? pickRandomPageIcon()
    : undefined;

  const now = Date.now();
  const parentPage = parentId ? get().pages[parentId] : undefined;
  if (parentId && (!parentPage || parentPage.workspaceId !== workspaceId || parentPage.trashedAt)) return null;
  const storedParentId =
    parentPage?.localFilePath && !parentPage.isFolder
      ? parentPage.parentId
      : parentId;
  const filePath = await allocateLocalMarkdownFilePath(
    get, workspaceId, parentId, title, requestedFilePath,
  );
  if (!filePath) return null;

  const id = generateLocalPageId(workspaceId, filePath, true);
  const newPage: Page = {
    id,
    workspaceId,
    parentId: storedParentId,
    content: cloneLocalPageContent(content),
    isFolder: false,
    isLocked: false,
    fontSize: "default",
    fontFamily: "default",
    localFilePath: filePath,
    createdAt: now,
    updatedAt: now,
    order: now,
    ...(randomIcon ? { icon: randomIcon } : {}),
  };

  set((state) => ({
    pages: { ...state.pages, [id]: newPage },
  }));

  syncLocalPageMetadataCache(id, newPage);
  markSelfWrite(filePath);
  let saved: boolean;
  try {
    saved = await get().saveLocalPageContent(
      id,
      cloneLocalPageContent(newPage.content),
      { force: true, createOnly: true },
    );
  } catch {
    saved = false;
  }
  if (!saved) {
    preserveLocalEditorDraft(set, get, id, filePath);
    return null;
  }

  const persisted = get().pages[id];
  if (!persisted) return null;
  persistPageSnapshot(persisted);
  appendLocalFolderOrderEntries(workspaceId, [persisted]);
  return id;
});
