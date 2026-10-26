import type { BlockNoteEditor } from "@blocknote/core";

let pending: { pageId: string; fragment: string; expires: number } | null = null;
const listeners = new Set<() => void>();

export function requestEditorLinkAnchor(pageId: string, fragment: string): void {
  pending = { pageId, fragment, expires: Date.now() + 5000 };
  listeners.forEach((listener) => listener());
}

export function takeEditorLinkAnchor(pageId: string): string | null {
  if (!pending || pending.pageId !== pageId) return null;
  const request = pending;
  pending = null;
  return request.expires >= Date.now() ? request.fragment : null;
}

export function subscribeEditorLinkAnchor(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function headingSlug(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
}

export function scrollToEditorLinkAnchor(editor: BlockNoteEditor<any, any, any>, fragment: string): boolean {
  const root = editor.domElement;
  if (!root) return false;
  if (!fragment) {
    root.closest(".page-scroll-container")?.scrollTo({ top: 0 });
    return true;
  }
  const slugs = new Set<string>();
  for (const heading of root.querySelectorAll<HTMLElement>('.bn-block-content[data-content-type="heading"]')) {
    const base = headingSlug(heading.textContent ?? "");
    let slug = base, suffix = 0;
    while (slugs.has(slug)) slug = `${base}-${++suffix}`;
    slugs.add(slug);
    const block = heading.closest<HTMLElement>("[data-id]");
    if (slug !== fragment && block?.dataset.id !== fragment) continue;
    heading.scrollIntoView({ block: "start", behavior: "auto" });
    return true;
  }
  return false;
}
