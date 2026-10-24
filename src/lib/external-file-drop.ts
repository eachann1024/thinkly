export function isExternalFileTransfer(data: Pick<DataTransfer, "types">): boolean {
  const types = Array.from(data.types);
  return types.includes("Files") && !types.some(type =>
    /blocknote|application\/x-goose/i.test(type));
}

export function getExternalFileDropTarget(target: EventTarget | null): "editor" | "sidebar" | null {
  if (!(target instanceof Element)) return null;
  if (target.closest(".workspace-editor-surface")) return "editor";
  if (target.closest(".workspace-sidebar-pane")) return "sidebar";
  return null;
}

export function readExternalDroppedFiles(data: DataTransfer): { files: File[]; skippedCount: number } {
  const items = Array.from(data.items || []).filter(item => item.kind === "file");
  if (!items.length) return { files: Array.from(data.files || []), skippedCount: 0 };
  const files: File[] = [];
  let skippedCount = 0;
  for (const item of items) {
    if (item.webkitGetAsEntry?.()?.isDirectory) { skippedCount++; continue; }
    const file = item.getAsFile();
    if (file) files.push(file);
    else skippedCount++;
  }
  return { files, skippedCount };
}

export function getSidebarFileDragState(data: DataTransfer): "accepted" | "rejected" | "pending" {
  const files = Array.from(data.files || []);
  if (files.length) return files.some(file => /\.(md|markdown)$/i.test(file.name)) ? "accepted" : "rejected";
  const items = Array.from(data.items || []).filter(item => item.kind === "file");
  if (items.some(item => /^text\/(markdown|x-markdown)$/i.test(item.type))) return "accepted";
  if (!items.length || items.some(item => !item.type || /^(text\/plain|application\/octet-stream)$/i.test(item.type))) return "pending";
  return "rejected";
}
