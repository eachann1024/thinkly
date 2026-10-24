import { comparisonLocalPath, localPathsAreCaseInsensitive } from "./canonicalLocalPath";

const openedPaths = new Map<string, Map<string, string>>();

export function rememberAssociatedMarkdownPath(notebookId: string, filePath: string): void {
  let paths = openedPaths.get(notebookId);
  if (!paths) {
    paths = new Map();
    openedPaths.set(notebookId, paths);
  }
  paths.set(comparisonLocalPath(filePath, localPathsAreCaseInsensitive()), filePath);
}

export function associatedMarkdownPaths(notebookId: string): string[] {
  return [...(openedPaths.get(notebookId)?.values() ?? [])];
}
