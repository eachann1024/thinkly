import { BlockNoteEditor } from "@blocknote/core";
import { editorSchema } from "@/components/editor/core/schema";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";

const MEDIA_TAGS = new Set(["img", "video", "source", "audio"]);

function quotedAttr(attrs: string, name: string): string | undefined {
  return attrs.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"))?.[2];
}

function setQuotedAttr(attrs: string, name: string, value: string): string {
  if (new RegExp(`\\b${name}\\s*=`, "i").test(attrs)) {
    return attrs.replace(
      new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"),
      `${name}="${value}"`,
    );
  }
  return `${attrs} ${name}="${value}"`;
}

export function applyExportMediaSrc(html: string): string {
  return html.replace(/<([a-zA-Z][\w:-]*)([^>]*?)>/g, (full, tag, attrs) => {
    const name = String(tag).toLowerCase();
    const dataUrl = quotedAttr(attrs, "data-url");
    if (!dataUrl) return full;

    if (MEDIA_TAGS.has(name)) {
      const src = quotedAttr(attrs, "src");
      if (src) return full;
      return `<${tag}${setQuotedAttr(attrs, "src", dataUrl)}>`;
    }
    if (name === "a") {
      const href = quotedAttr(attrs, "href");
      if (href) return full;
      return `<${tag}${setQuotedAttr(attrs, "href", dataUrl)}>`;
    }
    return full;
  });
}

function asExportBlocks(blocks: BlockNoteContent): BlockNoteContent {
  if (Array.isArray(blocks) && blocks.length > 0) return blocks;
  return [{ type: "paragraph", content: [] }] as BlockNoteContent;
}

export function blocksToEditorHtml(blocks: BlockNoteContent): string {
  const content = asExportBlocks(blocks);
  const editor = BlockNoteEditor.create({
    schema: editorSchema,
    initialContent: content as never,
  });
  const html = editor.blocksToFullHTML(content as never);
  return applyExportMediaSrc(html);
}
