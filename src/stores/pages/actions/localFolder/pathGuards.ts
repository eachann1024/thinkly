import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/actions/localFolder/pathGuards.ts#block1:1">`
zh-Hans:
  nameUnavailable: "无法生成可用名称，请手动修改"
en:
  nameUnavailable: "Couldn’t generate an available name. Enter one manually."
ja:
  nameUnavailable: "使用可能な名前を生成できません。手動で変更してください"
`);
import type { Page } from "@/types";
import { duplicateSuffixName } from "@/lib/duplicateName";

export function normalizeLocalFilePathKey(filePath: string): string {
  return filePath
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

export function findDuplicateLocalFileOwner(
  pages: Record<string, Page>,
  pageId: string,
  filePath: string,
): Page | null {
  const targetKey = normalizeLocalFilePathKey(filePath);
  return (
    Object.values(pages).find(
      (candidate) =>
        candidate.id !== pageId &&
        !candidate.isFolder &&
        candidate.localFilePath &&
        normalizeLocalFilePathKey(candidate.localFilePath) === targetKey,
    ) ?? null
  );
}

export async function localFilePathExists(
  fs: GooseFs,
  filePath: string,
): Promise<boolean> {
  try {
    if (fs.existsAsync) {
      return await fs.existsAsync(filePath);
    }
    return fs.exists?.(filePath) ?? false;
  } catch {
    return false;
  }
}

export async function isLocalFilePathTaken(
  fs: GooseFs,
  pages: Record<string, Page>,
  pageId: string,
  filePath: string,
  currentFilePath?: string | null,
): Promise<boolean> {
  if (
    currentFilePath &&
    normalizeLocalFilePathKey(currentFilePath) ===
      normalizeLocalFilePathKey(filePath)
  ) {
    return false;
  }
  if (findDuplicateLocalFileOwner(pages, pageId, filePath)) return true;
  return localFilePathExists(fs, filePath);
}

export async function allocateUniqueLocalBaseName(
  fs: GooseFs,
  pages: Record<string, Page>,
  pageId: string,
  dir: string,
  baseName: string,
  ext: string,
  currentFilePath?: string | null,
): Promise<string> {
  const preferredPath = `${dir}/${baseName}${ext}`;
  if (
    !(await isLocalFilePathTaken(
      fs,
      pages,
      pageId,
      preferredPath,
      currentFilePath,
    ))
  ) {
    return baseName;
  }

  for (let suffix = 1; suffix <= 99; suffix += 1) {
    const candidate = duplicateSuffixName(baseName, suffix);
    const candidatePath = `${dir}/${candidate}${ext}`;
    if (
      !(await isLocalFilePathTaken(
        fs,
        pages,
        pageId,
        candidatePath,
        currentFilePath,
      ))
    ) {
      return candidate;
    }
  }

  throw new Error(storeText("nameUnavailable"));
}
