/** summary 保留 Markdown inline；结构标签转义以免用户文字提前关闭 details。 */
export function serializeToggleDetails(
  block: any,
  text: string,
  serializeBlocks: (blocks: any[], indent: string) => string,
): string {
  let summary = text.replace(/<\/?(?:details|summary)\b[^>]*>/gi,
    (tag) => tag.replace(/</g, "&lt;").replace(/>/g, "&gt;"))
    .replace(/\n/g, "<br>");
  if (block.type === "heading") {
    const level = Math.min(3, Math.max(1, Number(block.props?.level) || 1));
    summary = `<h${level}>${summary}</h${level}>`;
  }
  const children = Array.isArray(block.children) ? block.children : [];
  const inner = children.length ? serializeBlocks(children, "") : "";
  const collapsed = block.props?.collapsed === true || block.props?.collapsed === "true";
  return `<details${collapsed ? "" : " open"}>\n<summary>${summary}</summary>\n\n${inner}${inner ? "\n\n" : ""}</details>`;
}
