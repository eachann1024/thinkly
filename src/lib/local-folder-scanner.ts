import { portableHistoryIds } from "./history/notebookHistory";
import { pruneParsedMarkdown } from "./local-folder-scanner/parsed-cache";
import {
  type LocalPageIdMap,
  readLocalPageIdMap,
  resolveOrCreateStableId,
  pruneLocalPageIdMap,
  toRelativePath,
  writeLocalPageIdMap,
} from "@/lib/local-page-idmap";
import type { Page } from "@/types";
import {
  type LocalFolderScannerOptions,
  type LocalFolderEntry,
  SCAN_CPU_SLICE_MS,
  shouldIgnoreEntry,
  readDirectory,
  readMarkdownFile,
  buildFolderPage,
  nowForScanBudget,
  yieldToRenderer,
} from "./local-folder-scanner/entries";
import { readUnchangedMarkdown } from "./local-folder-scanner/read-cache";
import { buildMarkdownPage } from "./local-folder-scanner/markdown";
import { canonicalRelativePath, comparisonLocalPath, localPathsAreCaseInsensitive } from "./canonicalLocalPath";
export {
  buildLocalPageId,
  shouldIgnoreEntry,
  shouldIgnoreLocalRelativePath,
  localFileTitleFromPath,
} from "./local-folder-scanner/entries";
export {
  parseLocalMarkdownContent,
  type ParsedLocalMarkdown,
} from "./local-folder-scanner/markdown";

export async function scanLocalFolderPages({
  notebookId,
  basePath,
  gooseFs,
  hiddenFolders = [],
  forceRead = false,
  readOnly = false,
  includedFilePaths = [],
}: LocalFolderScannerOptions): Promise<Page[]> {
  const idMap: LocalPageIdMap = readLocalPageIdMap(notebookId);
  let idMapDirty = false;
  const portable = readOnly ? {} : await portableHistoryIds(basePath);
  for (const [path, id] of Object.entries(portable)) {
    if (!idMap[path] && !Object.values(idMap).includes(id)) { idMap[path] = id; idMapDirty = true; }
  }
  const liveRelativePaths = new Set<string>();
  const hiddenFoldersSet = new Set(hiddenFolders);
  const cacheScope = JSON.stringify([basePath, [...hiddenFolders].sort()]);

  const scanDirectory = async (
    dirPath: string,
    parentId?: string,
  ): Promise<Page[]> => {
    let entries: LocalFolderEntry[];

    try {
      entries = await readDirectory(gooseFs, dirPath);
    } catch (error) {
      console.error("readDir failed", error);
      if (dirPath === basePath) throw error;
      return [];
    }

    const pages: Page[] = [];

    interface PendingFileEntry {
      entry: LocalFolderEntry;
      fileId: string;
    }
    const pendingFiles: PendingFileEntry[] = [];

    for (const entry of entries) {
      if (shouldIgnoreEntry(entry.name, hiddenFoldersSet)) continue;

      if (entry.isDirectory) {
        const relativePath = toRelativePath(basePath, entry.path);
        liveRelativePaths.add(relativePath);
        const { id: folderId, dirty } = resolveOrCreateStableId(
          notebookId,
          relativePath,
          idMap,
        );
        if (dirty) idMapDirty = true;

        const folderPage = buildFolderPage(
          notebookId,
          basePath,
          entry,
          parentId,
          folderId,
        );
        pages.push(folderPage);
        const subPages = await scanDirectory(entry.path, folderPage.id);
        pages.push(...subPages);
        continue;
      }

      if (!entry.isFile || !/\.(md|markdown)$/i.test(entry.name)) {
        continue;
      }

      const relativePath = toRelativePath(basePath, entry.path);
      liveRelativePaths.add(relativePath);
      const { id: fileId, dirty } = resolveOrCreateStableId(
        notebookId,
        relativePath,
        idMap,
      );
      if (dirty) idMapDirty = true;

      pendingFiles.push({ entry, fileId });
    }

    const BATCH_SIZE = 8;
    const now = Date.now();
    for (let i = 0; i < pendingFiles.length; i += BATCH_SIZE) {
      const batch = pendingFiles.slice(i, i + BATCH_SIZE);
      const readResults = await Promise.allSettled(
        batch.map(({ entry }) =>
          forceRead
            ? readMarkdownFile(gooseFs, entry.path)
            : readUnchangedMarkdown(gooseFs, entry.path),
        ),
      );

      let sliceStartedAt = nowForScanBudget();
      for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
        const pending = batch[batchIndex];
        const readResult = readResults[batchIndex];
        if (readResult.status === "rejected") {
          console.error(
            "[local-folder-scanner] 跳过文件读取失败:",
            readResult.reason,
          );
          continue;
        }

        try {
          const page = await buildMarkdownPage(
            notebookId,
            basePath,
            pending.entry,
            readResult.value,
            now,
            pending.fileId,
            cacheScope,
          );
          page.parentId = parentId;
          pages.push(page);
        } catch (error) {
          console.error("[local-folder-scanner] 跳过文件解析失败:", error);
        }

        const hasMoreFiles =
          batchIndex < batch.length - 1 || i + BATCH_SIZE < pendingFiles.length;
        if (
          hasMoreFiles &&
          nowForScanBudget() - sliceStartedAt >= SCAN_CPU_SLICE_MS
        ) {
          await yieldToRenderer();
          sliceStartedAt = nowForScanBudget();
        }
      }
    }

    return pages;
  };

  const pages = await scanDirectory(basePath);
  const caseInsensitive = localPathsAreCaseInsensitive();
  const pathKey = (filePath: string) => comparisonLocalPath(filePath, caseInsensitive);
  const scannedPaths = new Set(pages.flatMap((page) =>
    page.localFilePath ? [pathKey(page.localFilePath)] : []));
  for (const filePath of includedFilePaths) {
    const relativePath = canonicalRelativePath(basePath, filePath);
    if (!relativePath || scannedPaths.has(pathKey(filePath))) continue;
    try {
      const exists = gooseFs.existsAsync
        ? await gooseFs.existsAsync(filePath) : gooseFs.exists(filePath);
      if (!exists) continue;
      const { id, dirty } = resolveOrCreateStableId(notebookId, relativePath, idMap);
      const entry = {
        name: relativePath.split("/").pop()!,
        path: filePath,
        isFile: true,
        isDirectory: false,
      };
      const page = await buildMarkdownPage(notebookId, basePath, entry,
        await readMarkdownFile(gooseFs, filePath), Date.now(), id, cacheScope);
      const parentPath = filePath.replace(/[\\/][^\\/]+$/, "");
      page.parentId = pages.find((candidate) =>
        candidate.isFolder && candidate.localFilePath &&
        pathKey(candidate.localFilePath) === pathKey(parentPath))?.id;
      pages.push(page);
      liveRelativePaths.add(relativePath);
      if (dirty) idMapDirty = true;
    } catch (error) {
      console.error("[local-folder-scanner] 显式打开文件读取失败", filePath, error);
    }
  }
  pruneParsedMarkdown(
    cacheScope,
    new Set(
      pages.flatMap((page) =>
        page.localFilePath && !page.isFolder ? [page.localFilePath] : [],
      ),
    ),
  );

  if (readOnly) return pages;
  if (idMapDirty) {
    writeLocalPageIdMap(notebookId, idMap);
  }
  pruneLocalPageIdMap(notebookId, liveRelativePaths);

  return pages;
}
