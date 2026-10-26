import { useNotebooks } from "../../../useNotebooks";
import { v4 as uuidv4 } from "uuid";
import {
  toRelativePath,
  readLocalPageIdMap,
  resolveOrCreateStableId,
  writeLocalPageIdMap,
} from "@/lib/local-page-idmap";
import type { StoreGet } from "../hydrate";
import { UNTITLED_PAGE_TITLE } from "@/components/editor/utils/page-title";
import { duplicateSuffixName } from "@/lib/duplicateName";

export function generateLocalPageId(
  notebookId: string,
  filePath: string,
  freshNote = false,
): string {
  if (freshNote) return uuidv4();
  const notebook = useNotebooks.getState().notebooks[notebookId];
  if (!notebook?.localPath) return uuidv4();
  const basePath = notebook.localPath;
  const relativePath = toRelativePath(basePath, filePath);
  const map = readLocalPageIdMap(notebookId);
  const { id, dirty } = resolveOrCreateStableId(notebookId, relativePath, map);
  if (dirty) {
    writeLocalPageIdMap(notebookId, map);
  }
  return id;
}

export async function allocateLocalMarkdownFilePath(
  get: StoreGet,
  workspaceId: string,
  parentId: string | undefined,
  title: string | undefined,
  requestedFilePath?: string,
): Promise<string | null> {
  const notebook = useNotebooks.getState().notebooks[workspaceId];
  if (
    !notebook?.localPath ||
    typeof window === "undefined" ||
    !window.gooseFs
  ) {
    return null;
  }

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

  const localPath = notebook.localPath;
  const normalizedTitle = (
    (title || UNTITLED_PAGE_TITLE).trim() || UNTITLED_PAGE_TITLE
  ).replace(/[\\/:*?"<>|]/g, "_");
  const parentPath = resolveParentPath();
  const parentPage = parentId ? get().pages[parentId] : undefined;
  const baseDir = parentPath
    ? parentPage?.isFolder
      ? parentPath
      : parentPath.replace(/[^\/\\]+$/, "")
    : localPath;
  const normalizedBaseDir = baseDir.replace(/[\/\\]$/, "");

  const normalizePath = (path: string) => path.replace(/\\/g, "/").replace(/\/+$/, "");
  const isReserved = (path: string) => Object.values(get().pages).some((page) =>
    !page.trashedAt && page.localFilePath && normalizePath(page.localFilePath) === normalizePath(path),
  );
  const checkExists = async (path: string) => {
    if (isReserved(path)) return true;
    const exists = window.gooseFs?.existsAsync
      ? await window.gooseFs.existsAsync(path)
      : window.gooseFs?.exists(path) ?? false;
    return exists || isReserved(path);
  };

  const isPathInsideNotebookRoot = (candidate: string) => {
    const root = localPath.replace(/\\/g, "/").replace(/\/$/, "");
    const normalized = candidate.replace(/\\/g, "/");
    return normalized === root || normalized.startsWith(`${root}/`);
  };

  if (requestedFilePath) {
    if (!isPathInsideNotebookRoot(requestedFilePath)) return null;
    if (await checkExists(requestedFilePath)) return null;
    return requestedFilePath;
  }

  let filePath = `${normalizedBaseDir}/${normalizedTitle}.md`;
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
  return filePath;
}
