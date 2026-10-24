import type { JSONContent } from "@/types";

export function collapseComposerSearchText(text: string): string {
  return text.replace(/[\u200B\uFEFF]/g, "").replace(/\s+/g, " ").trim();
}

export function searchTextOutsideSlashCommand(text: string): string {
  return collapseComposerSearchText(text).replace(/(^|\s)\/\S*$/, "$1").trim();
}

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
