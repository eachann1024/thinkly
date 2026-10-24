import type { JSONContent } from "@/types";
import { importFromMarkdown } from "@/lib/export";
import { usePages } from "@/stores/usePages";
import { resolveLocalFolderImportParentId } from "@/lib/local-folder-target";
import { getLocalFolderFileDropTarget } from "@/lib/local-folder-file-drop-target";
import { resolveLocalFolderImportTarget } from "@/lib/local-folder-import-target";
import { canAcceptLocalAssetBytes } from "@/lib/local-file-asset-contract";

export function isSupportedTextImportFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ext === "md" || ext === "markdown";
}

export async function importTextFilesToLocalFolder(options: {
  workspaceId: string;
  files: File[];
  parentId?: string;
}): Promise<{ importedIds: string[]; failedCount: number }> {
  const { workspaceId, files, parentId } = options;
  const importedIds: string[] = [];
  let failedCount = 0;
  const target = resolveLocalFolderImportTarget(workspaceId, parentId);
  let acceptedBytes = 0;

  for (const file of files) {
    try {
      if (!isSupportedTextImportFile(file) || !canAcceptLocalAssetBytes(file.size, acceptedBytes)) {
        failedCount++;
        continue;
      }
      acceptedBytes += file.size;
      const text = await file.text();
      const current = resolveLocalFolderImportTarget(workspaceId, parentId);
      if (!target || !current || current.pageLocalFilePath !== target.pageLocalFilePath ||
          current.notebookRoot !== target.notebookRoot) throw new Error("Import destination changed");
      const filename = file.name.replace(/\.[^/.]+$/, "");
      const result = await importFromMarkdown(text, filename, {
        preserveStructure: true,
      });
      if (!result.success) {
        failedCount += 1;
        continue;
      }

      const pageId = await usePages.getState().createLocalPageRecord({
        workspaceId,
        parentId,
        title: result.title || filename,
        content: result.content as JSONContent,
      });
      if (!pageId) {
        failedCount += 1;
        continue;
      }
      importedIds.push(pageId);
    } catch {
      failedCount += 1;
    }
  }

  return { importedIds, failedCount };
}

export function resolveImportParentForDrop(workspaceId: string): string | undefined {
  return resolveLocalFolderImportParentId(
    workspaceId,
    getLocalFolderFileDropTarget(),
  );
}

export async function importFilesToLocalFolder(options: {
  workspaceId: string;
  files: File[];
  parentId?: string;
}): Promise<{ importedIds: string[]; failedCount: number }> {
  return importTextFilesToLocalFolder(options);
}
