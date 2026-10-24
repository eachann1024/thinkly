let hoveredDropTargetPageId: string | null = null;

export function setLocalFolderFileDropTarget(pageId: string | null): void {
  hoveredDropTargetPageId = pageId;
}

export function getLocalFolderFileDropTarget(): string | null {
  return hoveredDropTargetPageId;
}

export function clearLocalFolderFileDropTarget(): void {
  hoveredDropTargetPageId = null;
}
