import type { JSONContent, Page } from "@/types";
import { extractTitleFromContent } from "./content-text-extractor";

export const UNTITLED_PAGE_TITLE = "新页面";

export function normalizePageTitle(title: string | null | undefined): string {
  const trimmed = title?.trim() ?? "";
  return !trimmed || trimmed === "无标题" ? UNTITLED_PAGE_TITLE : trimmed;
}

export function withInternalPageTitle(
  content: JSONContent,
  title: string,
): JSONContent {
  const nextContent = structuredClone(content);
  const normalizedTitle = normalizePageTitle(title);

  if (Array.isArray(nextContent)) {
    const first = nextContent[0] as
      | {
          type?: string;
          props?: { level?: number };
          attrs?: { level?: number };
        }
      | undefined;
    const titleBlock = {
      type: "heading",
      props: { level: 1 },
      content: normalizedTitle,
    };
    if (
      first?.type === "heading" &&
      (first.props?.level === 1 || first.attrs?.level === 1)
    ) {
      nextContent[0] = { ...nextContent[0], content: normalizedTitle };
    } else {
      nextContent.unshift(titleBlock);
    }
    return nextContent;
  }

  const legacyContent = Array.isArray(nextContent.content)
    ? nextContent.content
    : [];
  const first = legacyContent[0];
  const titleInlineContent = [{ type: "text", text: normalizedTitle }];
  if (first?.type === "heading" && first.attrs?.level === 1) {
    legacyContent[0] = { ...first, content: titleInlineContent };
  } else {
    legacyContent.unshift({
      type: "heading",
      attrs: { level: 1 },
      content: titleInlineContent,
    });
  }
  return { ...nextContent, type: "doc", content: legacyContent };
}

export function getPageTitle(page: Page): string {
  try {
    if (!page || typeof page !== "object") return UNTITLED_PAGE_TITLE;
    if (page.localFilePath) {
      const name = page.localFilePath.split(/[\\/]/).pop() || "";
      const stripped = page.isFolder ? name : name.replace(/\.(md|markdown)$/i, "").trim();
      return normalizePageTitle(stripped);
    }

    return normalizePageTitle(extractTitleFromContent(page.content));
  } catch {
    return UNTITLED_PAGE_TITLE;
  }
}
