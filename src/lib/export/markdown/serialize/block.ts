import { resolveCalloutIcon } from "@/components/editor/blocks/callout/calloutIcons";
import { wrapLocalBlockPropsMarkdown } from "../localBlockPropsWrappers";
import { blockNoteInlineToText } from "./inline";
import { serializeAudio, serializeVideo } from "./audio";
import { serializeColumns } from "./columns";
import { serializeTable } from "./table";
import { serializeImage } from "./image";
import { serializeFile } from "./file";
import { serializeFencedCode } from "./codeFence";
import { serializeToggleDetails } from "./toggleDetails";
import { CHILDREN_CONSUMED_TYPES } from "./lists";
import { legacyItemInline, serializeLegacyListItem } from "./legacyLists";
import { wrapBlockChildrenMarkdown } from "../blockChildrenWrapper";

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
      // 多行引用：文本内 \n（hardBreak）逐行加 > 前缀
      result = text
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n");
      break;
    }

    case "codeBlock": {
      // 编辑器/新 parse 用 props，极旧存量数据用 attrs
      const codeProps = block.props ?? block.attrs ?? {};
      const lang = (codeProps.language || "").trim();
      if (lang === "yaml-frontmatter") {
        const trimmed = text.trim();
        result = trimmed ? `---\n${trimmed}\n---` : "---\n---";
      } else if (lang === "math" || lang === "latex") {
        result = `$$\n${text}\n$$`;
      } else {
        result = serializeFencedCode(text, lang, codeProps);
      }
      break;
    }

    case "image":
      result = serializeImage(block);
      break;

    case "imageResize": {
      // 极旧存量格式：attrs { src, alt, width, height, containerStyle }
      const attrs = block.attrs ?? block.props ?? {};
      const src = attrs.src || attrs.url || "";
      const alt = attrs.alt || attrs.caption || "";
      const meta: string[] = [];
      if (attrs.width != null && Number.isFinite(Number(attrs.width))) {
        meta.push(`width=${attrs.width}`);
      }
      if (attrs.height != null && Number.isFinite(Number(attrs.height))) {
        meta.push(`height=${attrs.height}`);
      }
      const containerStyle: string = attrs.containerStyle ?? "";
      let align: string | undefined;
      if (containerStyle.includes("margin: 0 auto 0 0")) align = "left";
      else if (containerStyle.includes("margin: 0 auto;")) align = "center";
      else if (containerStyle.includes("margin: 0 0 0 auto")) align = "right";
      if (align) meta.push(`align=${align}`);
      result = `![${alt}](${src})${meta.length ? `{${meta.join(" ")}}` : ""}`;
      break;
    }

    case "table":
      result = serializeTable(block);
      break;

    case "callout": {
      const icon = block.props?.icon ?? block.attrs?.emoji;
      const iconMarker = typeof icon === "string" ? `<!-- goose-note:callout-icon=${encodeURIComponent(icon)} -->` : "";
      const emoji = resolveCalloutIcon(icon);
      result = text
        .split("\n")
        .map((line, index) => (
          index === 0
            ? `> [!INFO] ${/^[A-Z][A-Za-z0-9]*$/.test(emoji) ? "💡" : emoji} ${iconMarker}${line}`
            : `> ${line}`
        ))
        .join("\n");
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
      return serializeColumns(block, serializeBlocks, indent);

    case "columnSection":
      return serializeBlocks(block.children ?? [], indent);

    case "toggleListItem": {
      result = serializeToggleDetails(block, text, serializeBlocks);
      break;
    }

    case "details": {
      // 极旧 parse 三件套格式：content = [detailsSummary, detailsContent]
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

    // ── 极旧 jsonContent 容器格式（TipTap 风格存量数据）────────────────────────
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

  result = wrapLocalBlockPropsMarkdown(block, result);

  // Markdown 无原生容器语法的子树使用显式边界，重新打开仍属于原父块。
  if (
    !CHILDREN_CONSUMED_TYPES.has(block.type) &&
    !(block.type === "heading" && block.props?.isToggleable) &&
    Array.isArray(block.children) &&
    block.children.length > 0
  ) {
    const childMd = serializeBlocks(block.children, indent);
    if (childMd) {
      if (!result && block.type === "paragraph") {
        result = "<!-- goose-note:empty-block=paragraph -->";
      }
      result += (result ? "\n\n" : "") + wrapBlockChildrenMarkdown(childMd);
    }
  }

  return result;
}
