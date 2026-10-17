import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/export/zip/inspectImport.ts#localMessages:1">`
zh-Hans:
  theBackupIsnTAValidZipFile: "备份文件不是有效的 ZIP 包"
  theBackupMetadataIsDamaged: "备份元数据已损坏"
  theBackupMetadataFormatIsInvalid: "备份元数据格式无效"
  theBackupMetadataIsMissingItsNotebookOrPage: "备份元数据缺少笔记本或页面列表"
  theBackupContainsInvalidNotebookData: "备份中包含无效的笔记本信息"
  theBackupContainsInvalidPageData: "备份中包含无效的页面信息"
  thisZipFileContainsNoRecoverableGooseNotesData: "ZIP 中没有可恢复的思绪 · Thinkly 数据"
en:
  theBackupIsnTAValidZipFile: "The backup isn’t a valid ZIP file"
  theBackupMetadataIsDamaged: "The backup metadata is damaged"
  theBackupMetadataFormatIsInvalid: "The backup metadata format is invalid"
  theBackupMetadataIsMissingItsNotebookOrPage: "The backup metadata is missing its notebook or page list"
  theBackupContainsInvalidNotebookData: "The backup contains invalid notebook data"
  theBackupContainsInvalidPageData: "The backup contains invalid page data"
  thisZipFileContainsNoRecoverableGooseNotesData: "This ZIP file contains no recoverable Thinkly data"
`;
const uiText = createTranslator(localMessages);
import type JSZipNs from "jszip";
import type { NotebookImportInspection } from "./types";

/**
 * 在覆盖本地数据前只读校验导入包，确保它至少包含一份可恢复的记事本数据。
 * 该函数不会创建记事本、页面或历史记录。
 */
export async function inspectNotebookImportZip(
  zipBlob: Blob,
): Promise<NotebookImportInspection> {
  const { default: JSZip } = await import("jszip");
  let zip: JSZipNs;
  try {
    zip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
  } catch (error) {
    throw new Error(uiText("theBackupIsnTAValidZipFile"), { cause: error });
  }

  const metaFile = zip.file("backup-metadata.json");
  if (metaFile) {
    let meta: unknown;
    try {
      meta = JSON.parse(await metaFile.async("text"));
    } catch (error) {
      throw new Error(uiText("theBackupMetadataIsDamaged"), { cause: error });
    }

    if (!meta || typeof meta !== "object") {
      throw new Error(uiText("theBackupMetadataFormatIsInvalid"));
    }
    const notebooks = (meta as { notebooks?: unknown }).notebooks;
    const pages = (meta as { pages?: unknown }).pages;
    if (
      !Array.isArray(notebooks) ||
      notebooks.length === 0 ||
      !Array.isArray(pages)
    ) {
      throw new Error(uiText("theBackupMetadataIsMissingItsNotebookOrPage"));
    }
    if (
      notebooks.some((notebook) => {
        if (!notebook || typeof notebook !== "object") return true;
        const candidate = notebook as { id?: unknown; name?: unknown };
        return (
          typeof candidate.id !== "string" ||
          !candidate.id.trim() ||
          typeof candidate.name !== "string" ||
          !candidate.name.trim()
        );
      })
    ) {
      throw new Error(uiText("theBackupContainsInvalidNotebookData"));
    }
    const notebookIds = new Set(
      notebooks.map((notebook) => (notebook as { id: string }).id),
    );
    if (
      pages.some((page) => {
        if (!page || typeof page !== "object") return true;
        const workspaceId = (page as { workspaceId?: unknown }).workspaceId;
        return (
          typeof workspaceId !== "string" ||
          !workspaceId.trim() ||
          !notebookIds.has(workspaceId)
        );
      })
    ) {
      throw new Error(uiText("theBackupContainsInvalidPageData"));
    }
    return {
      source: "metadata",
      notebookCount: notebooks.length,
      pageCount: pages.length,
    };
  }

  const notebookNames = new Set<string>();
  let pageCount = 0;
  zip.forEach((path, entry) => {
    if (entry.dir) return;
    const parts = path.split("/");
    if (parts.length < 2 || parts[0] === "assets" || parts[1] === "assets")
      return;
    const extension = path.split(".").pop()?.toLowerCase();
    if (extension !== "md" && extension !== "json") return;
    notebookNames.add(parts[0]);
    pageCount += 1;
  });
  if (notebookNames.size === 0 || pageCount === 0) {
    throw new Error(uiText("thisZipFileContainsNoRecoverableGooseNotesData"));
  }
  return {
    source: "folders",
    notebookCount: notebookNames.size,
    pageCount,
  };
}
