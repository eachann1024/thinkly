export const DUPLICATE_NAME_LIMIT = 99;

export function duplicateSuffixName(baseName: string, suffix: number): string {
  if (suffix <= 0) return baseName;
  return `${baseName} (${suffix})`;
}

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

export function resolveNotebookWindowTitle(
  notebookName: string,
  takenTitles: Iterable<string>,
  fallback: string,
): string {
  const base = notebookName.trim();
  if (!base) return fallback;
  return withExistingDuplicateSuffix(base, takenTitles) ?? base;
}
