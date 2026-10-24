import { sanitizeCssColor } from "../blockPropsProperties";
import { sanitizePageMentionProps, serializePageMentionMarkdown } from "@/components/editor/inline/pageMention";

function serializeInlineText(
  text: string,
  styles: Record<string, unknown>,
): string {
  const hasUnderline = styles.underline === true;
  const textColor = sanitizeCssColor(styles.textColor);
  const backgroundColor = sanitizeCssColor(styles.backgroundColor);
  const hasColor = textColor && textColor !== "default";
  const hasBg = backgroundColor && backgroundColor !== "default";
  const isYellowHighlight = hasBg && backgroundColor === "yellow" && !hasColor;

  if (styles.bold) text = `**${text}**`;
  if (styles.italic) text = `*${text}*`;
  if (styles.strike) text = `~~${text}~~`;
  if (styles.code) text = `\`${text}\``;
  if (isYellowHighlight) {
    text = `==${text}==`;
  } else if (hasColor || hasBg) {
    const parts: string[] = [];
    if (hasColor) parts.push(`color:${textColor}`);
    if (hasBg) parts.push(`background-color:${backgroundColor}`);
    text = `<span style="${escapeHtmlAttribute(parts.join("; "))}">${text}</span>`;
  }
  return hasUnderline ? `<u>${text}</u>` : text;
}

function extractLinkText(linkContent: any, preserveHardBreaks = false): string {
  if (typeof linkContent === "string") return preserveHardBreaks ? linkContent.replace(/\n/g, "<br>") : linkContent;
  if (!Array.isArray(linkContent)) return "";
  return linkContent
    .map((child: any) => {
      if (typeof child === "string") return preserveHardBreaks ? child.replace(/\n/g, "<br>") : child;
      if (child?.type === "hardBreak") return preserveHardBreaks ? "<br>" : "\n";
      return serializeTextWithBreaks(child?.text || "", child?.styles || {}, preserveHardBreaks);
    })
    .join("");
}

function serializeTextWithBreaks(text: string, styles: Record<string, unknown>, preserve: boolean): string {
  return preserve
    ? text.split("\n").map((line) => line ? serializeInlineText(line, styles) : "").join("<br>")
    : serializeInlineText(text, styles);
}

export function blockNoteInlineToText(content: any, preserveHardBreaks = false): string {
  if (content == null) return "";
  if (typeof content === "string") return preserveHardBreaks ? content.replace(/\n/g, "<br>") : content;
  if (
    typeof content === "object" &&
    !Array.isArray(content) &&
    Array.isArray(content.content)
  ) {
    return blockNoteInlineToText(content.content, preserveHardBreaks);
  }
  if (!Array.isArray(content)) return "";
  return content
    .map((item: any) => {
      if (typeof item === "string") return preserveHardBreaks ? item.replace(/\n/g, "<br>") : item;
      if (item == null) return "";
      if (item.type === "hardBreak") return preserveHardBreaks ? "<br>" : "\n";
      if (item.type === "paragraph" && Array.isArray(item.content)) {
        return blockNoteInlineToText(item.content, preserveHardBreaks);
      }
      if (item.type === "link") {
        const linkText = extractLinkText(item.content, preserveHardBreaks);
        return `[${linkText}](${item.href || ""})`;
      }
      if (item.type === "pageMention") {
        const mention = sanitizePageMentionProps(item);
        return mention ? serializePageMentionMarkdown(mention) : "";
      }
      return serializeTextWithBreaks(item.text || "", item.styles || {}, preserveHardBreaks);
    })
    .join("");
}

export function escapePipeInCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
