/**
 * 笔记本没有颜色字段。色相来自 id，饱和度和亮度固定，
 * 深浅主题下白字都可读，同一 id 始终同一颜色。
 */
export function notebookMarkColor(notebookId: string): string {
  let hash = 0;
  for (let i = 0; i < notebookId.length; i += 1) {
    hash = (Math.imul(hash, 31) + notebookId.charCodeAt(i)) >>> 0;
  }
  return `hsl(${hash % 360} 38% 46%)`;
}

export function notebookMarkGlyph(name: string): string {
  return Array.from(name.trim())[0] ?? "";
}
