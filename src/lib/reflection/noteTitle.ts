import type { Page } from "@/types";
import { extractTitleFromContent } from "@/components/editor/utils/content-text-extractor";

export function pageDisplayTitle(page: Pick<Page, "content" | "localFilePath">): string {
  const fromContent = extractTitleFromContent(page.content).trim();
  if (fromContent) return fromContent;
  const name = page.localFilePath?.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "");
  return name?.trim() || "Untitled";
}
