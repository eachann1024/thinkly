import type { JSONContent } from "@/types";

/** 笔记检索只用正文：换行和零宽字符折成空格，@ / 图片 chip 不进这段。 */
export function collapseComposerSearchText(text: string): string {
  return text.replace(/[\u200B\uFEFF]/g, "").replace(/\s+/g, " ").trim();
}

/** 行首或空白后的 `/指令` 还在选命令时不进检索；路径里的斜杠保留。 */
export function searchTextOutsideSlashCommand(text: string): string {
  return collapseComposerSearchText(text).replace(/(^|\s)\/\S*$/, "$1").trim();
}

/** 打开搜索时把已有查询种进输入框，换行变成多段。 */
export function composerDocFromPlainText(text: string): JSONContent | null {
  if (!text) return null;
  return {
    type: "doc",
    content: text.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}
