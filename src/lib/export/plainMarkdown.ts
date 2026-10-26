import { isMap } from "yaml";
import { LEGACY_SETTING_KEYS, NOTE_ID_KEY, renderFrontmatter, splitFrontmatter } from "@/lib/note-metadata/identity";
import { NOTE_META_KEY } from "./markdown/noteMeta";

export function stripExportMetadata(markdown: string): string {
  const { document, tail, present } = splitFrontmatter(markdown);
  if (!present) return markdown;
  let removed = false;
  for (const key of [NOTE_META_KEY, NOTE_ID_KEY, ...LEGACY_SETTING_KEYS]) {
    if (document.has(key)) { document.delete(key); removed = true; }
  }
  if (!removed) return markdown;
  return isMap(document.contents) && document.contents.items.length
    ? renderFrontmatter(document, tail, true)
    : tail.replace(/^\r?\n(?:\r?\n)?/, "");
}

export function addExportTitle(markdown: string, title: string): string {
  const { document, tail, present } = splitFrontmatter(markdown);
  return present
    ? renderFrontmatter(document, `\n\n# ${title}\n\n${tail.replace(/^\r?\n(?:\r?\n)?/, "")}`, true)
    : `# ${title}\n\n${markdown}`;
}
