import { resolveCalloutIcon } from "@/components/editor/blocks/callout/calloutIcons";
import { wrapLocalBlockPropsMarkdown } from "../localBlockPropsWrappers";
import { blockNoteInlineToText } from "./inline";
import { serializeAudio, serializeVideo } from "./audio";
import { serializeTable } from "./table";
import { serializeImage } from "./image";
import { serializeFile } from "./file";
import { serializeFencedCode } from "./codeFence";
import { serializeToggleDetails } from "./toggleDetails";
import { legacyItemInline, serializeLegacyListItem } from "./legacyLists";

export function blockNoteBlockToMarkdown(
  block: any, indent: string,
  serializeBlocks: (blocks: any[], indent: string) => string,
): string {
  const text = blockNoteInlineToText(block.content, ["paragraph", "heading"].includes(block.type));
  let result: string;

  switch (block.type) {
    case "heading":
      result = block.props?.isToggleable
        ? serializeToggleDetails(block, text, serializeBlocks)
        : `${"#".repeat(block.props?.level || block.attrs?.level || 1)} ${text}`;
      break;

    case "quote": {
      result = text
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n");
      break;
    }

    case "codeBlock": {
      const codeProps = block.props ?? block.attrs ?? {};
      const lang = (codeProps.language || "").trim();
      if (lang === "yaml-frontmatter") {
        const trimmed = text.trim();
        result = trimmed ? `---\n${trimmed}\n---` : "---\n---";
      } else if (lang === "math" || lang === "latex") {
        result = `$$\n${text}\n$$`;
      } else {
        result = serializeFencedCode(text, lang);
      }
      break;
    }

    case "image":
      result = serializeImage(block);
      break;

    case "imageResize":
      result = serializeImage(block);
      break;

    case "table":
      result = serializeTable(block);
      break;

    case "callout": {
      const icon = block.props?.icon ?? block.attrs?.emoji;
      const emoji = resolveCalloutIcon(icon);
      const shown = /^[A-Z][A-Za-z0-9]*$/.test(emoji) ? "💡" : emoji;
      result = text.split("\n").map((line, index) => index === 0 ? `> [!INFO] ${shown} ${line}` : `> ${line}`).join("\n");
      break;
    }

    case "divider":
    case "horizontalRule":
      result = "---";
      break;

    case "file":
      result = serializeFile(block);
      break;

    case "video":
      result = serializeVideo(block);
      break;

    case "audio":
      result = serializeAudio(block);
      break;

    case "columnLayout":
    case "columnSection":
      return "";

    case "toggleListItem": {
      result = serializeToggleDetails(block, text, serializeBlocks);
      break;
    }

    case "details": {
      const contentArr: any[] = Array.isArray(block.content)
        ? block.content
        : [];
      const summaryBlock = contentArr.find(
        (c: any) => c?.type === "detailsSummary",
      );
      const contentBlock = contentArr.find(
        (c: any) => c?.type === "detailsContent",
      );
      const summaryText = summaryBlock
        ? blockNoteInlineToText(summaryBlock.content)
        : "详情";
      const innerBlocks: any[] = Array.isArray(contentBlock?.content)
        ? contentBlock.content
        : [];
      const innerMd = serializeBlocks(innerBlocks, "");
      result = `<details>\n<summary>${summaryText}</summary>\n\n${innerMd}\n\n</details>`;
      break;
    }

    case "detailsSummary":
    case "detailsContent":
      result = text;
      break;

    case "bulletList":
    case "taskList": {
      const items: any[] = Array.isArray(block.content) ? block.content : [];
      result = items
        .map((item: any) => serializeLegacyListItem(item, indent))
        .filter(Boolean)
        .join("\n");
      break;
    }

    case "orderedList": {
      const items: any[] = Array.isArray(block.content) ? block.content : [];
      const startNum = block.attrs?.start ?? block.props?.start ?? 1;
      result = items
        .map((item: any, idx: number) => {
          const explicit = item?.attrs?.start;
          const num = explicit != null ? explicit : startNum + idx;
          const line = `${indent}${num}. ${legacyItemInline(item)}`;
          if (Array.isArray(item?.children) && item.children.length > 0) {
            const childMd = item.children
              .map((c: any) => serializeLegacyListItem(c, indent + "  "))
              .filter(Boolean)
              .join("\n");
            return childMd ? `${line}\n${childMd}` : line;
          }
          return line;
        })
        .join("\n");
      break;
    }

    case "blockquote": {
      const innerContent: any[] = Array.isArray(block.content)
        ? block.content
        : [];
      const quoteText = innerContent
        .map((b: any) => blockNoteInlineToText(b?.content ?? b))
        .join("\n");
      result = quoteText
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n");
      break;
    }

    default:
      result = text;
  }

  return wrapLocalBlockPropsMarkdown(block, result);
}
