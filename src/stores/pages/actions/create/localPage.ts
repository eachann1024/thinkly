import { flushEditorContent } from "../flushEditor";
import type { StoreSet, StoreGet } from "../hydrate";
import { UNTITLED_PAGE_TITLE } from "@/components/editor/utils/page-title";
import { createEmptyLocalPageContent } from "@/components/editor/utils/blocknote-content";
import { useNotebooks } from "../../../useNotebooks";
import { focusNewPage, cloneLocalPageContent } from "./content";
import type { JSONContent, Page } from "@/types";
import { useSettings } from "@/stores/useSettings";
import { pickRandomPageIcon } from "@/lib/randomPageIcon";
import { generateLocalPageId } from "./localPaths";
import {
  syncLocalPageMetadataCache,
  persistPageSnapshot,
} from "../../persistence";
import { markSelfWrite } from "@/lib/local-md-snapshot";
import { appendLocalFolderOrderEntries } from "@/stores/localFolderOrder";
import { duplicateSuffixName } from "@/lib/duplicateName";

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
): Promise<string | null> => {
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

  const resolveParentPath = () => {
    if (!parentId) return null;
    const parentPage = get().pages[parentId];
    if (parentPage?.localFilePath) return parentPage.localFilePath;
    const prefix = `local-${workspaceId}-`;
    if (!parentId.startsWith(prefix)) return null;
    const encoded = parentId.slice(prefix.length);
    try {
      const relativePath = decodeURIComponent(encoded);
      return `${notebook.localPath}/${relativePath}`;
    } catch {
      return null;
    }
  };

  const now = Date.now();
  const localPath = notebook.localPath;
  const normalizedTitle = (
    (title || UNTITLED_PAGE_TITLE).trim() || UNTITLED_PAGE_TITLE
  ).replace(/[\\/:*?"<>|]/g, "_");
  const parentPath = resolveParentPath();
  const parentPage = parentId ? get().pages[parentId] : undefined;
  const storedParentId =
    parentPage?.localFilePath && !parentPage.isFolder
      ? parentPage.parentId
      : parentId;
  const baseDir = parentPath
    ? parentPage?.isFolder
      ? parentPath
      : parentPath.replace(/[^\/\\]+$/, "")
    : localPath;
  const normalizedBaseDir = baseDir.replace(/[\/\\]$/, "");

  const checkExists = async (path: string) => {
    if (window.gooseFs?.existsAsync) {
      return await window.gooseFs.existsAsync(path);
    }
    return window.gooseFs?.exists(path) ?? false;
  };

  const isPathInsideNotebookRoot = (candidate: string) => {
    const root = localPath.replace(/\\/g, "/").replace(/\/$/, "");
    const normalized = candidate.replace(/\\/g, "/");
    return normalized === root || normalized.startsWith(`${root}/`);
  };

  let filePath: string;
  if (requestedFilePath) {
    if (!isPathInsideNotebookRoot(requestedFilePath)) return null;
    if (await checkExists(requestedFilePath)) return null;
    filePath = requestedFilePath;
  } else {
    filePath = `${normalizedBaseDir}/${normalizedTitle}.md`;
    if (await checkExists(filePath)) {
      let suffix = 1;
      while (
        await checkExists(
          `${normalizedBaseDir}/${duplicateSuffixName(normalizedTitle, suffix)}.md`,
        )
      ) {
        suffix++;
      }
      filePath = `${normalizedBaseDir}/${duplicateSuffixName(normalizedTitle, suffix)}.md`;
    }
  }

  const id = generateLocalPageId(workspaceId, filePath);
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
      { force: true, createOnly: Boolean(requestedFilePath) },
    );
  } catch {
    saved = false;
  }
  if (!saved) {
    set((state) => {
      const nextPages = { ...state.pages };
      delete nextPages[id];
      return { pages: nextPages };
    });
    return null;
  }

  const persisted = get().pages[id];
  if (!persisted) return null;
  persistPageSnapshot(persisted);
  appendLocalFolderOrderEntries(workspaceId, [persisted]);
  return id;
};
