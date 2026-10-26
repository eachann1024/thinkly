import type { JSONContent } from "@/types";

export interface PageWriteTransition {
  pageId: string;
  content: JSONContent;
  pending: Promise<() => void>[];
}

export async function beginPageWriteTransition(pageId: string, content: JSONContent) {
  const detail: PageWriteTransition = { pageId, content, pending: [] };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("goose-note:prepare-page-write", { detail }));
  }
  const settled = await Promise.allSettled(detail.pending);
  return () => settled.forEach((result) => {
    if (result.status === "fulfilled") result.value();
  });
}
