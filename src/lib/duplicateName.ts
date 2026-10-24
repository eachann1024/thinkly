/**
 * 重名后缀与本地文件共用：空闲用原名，否则 `名称 (1)`、`名称 (2)`… 直到 99。
 * allocateUniqueLocalBaseName、新建页和窗口标题都走 duplicateSuffixName，避免另起一套后缀。
 */
export const DUPLICATE_NAME_LIMIT = 99;

export function duplicateSuffixName(baseName: string, suffix: number): string {
  if (suffix <= 0) return baseName;
  return `${baseName} (${suffix})`;
}

/** 原名未被占用则原样返回；否则取第一个空闲的现有后缀。全部占满时返回 null。 */
export function withExistingDuplicateSuffix(
  baseName: string,
  taken: Iterable<string>,
): string | null {
  const used = new Set(taken);
  for (let suffix = 0; suffix <= DUPLICATE_NAME_LIMIT; suffix += 1) {
    const candidate = duplicateSuffixName(baseName, suffix);
    if (!used.has(candidate)) return candidate;
  }
  return null;
}

/** 窗口标题：有笔记本名就用它，并避开其它窗口已经占用的标题。 */
export function resolveNotebookWindowTitle(
  notebookName: string,
  takenTitles: Iterable<string>,
  fallback: string,
): string {
  const base = notebookName.trim();
  if (!base) return fallback;
  return withExistingDuplicateSuffix(base, takenTitles) ?? base;
}
