import { sanitizeCssColor } from "../blockPropsMarker";
import {
  pageMentionFromMarkdownLink,
  pageMentionFromWikiLink,
} from "@/components/editor/inline/pageMention";

function applyStyles(nodes: any[], extra: Record<string, any>): any[] {
  return nodes.map((node) => {
    if (typeof node === "string") {
      return { type: "text", text: node, styles: { ...extra } };
    }
    if (node?.type === "text") {
      return { ...node, styles: { ...(node.styles || {}), ...extra } };
    }
    return node;
  });
}

function toLinkContent(nodes: any[]): any[] {
  return nodes.flatMap((node) => {
    if (typeof node === "string") {
      return [{ type: "text", text: node, styles: {} }];
    }
    if (node?.type === "text") {
      return [{ ...node, styles: node.styles || {} }];
    }
    if (node?.type === "hardBreak") return [{ type: "text", text: "\n", styles: {} }];
    if (node?.type === "link" && Array.isArray(node.content)) {
      return toLinkContent(node.content);
    }
    return [];
  });
}

function parseSpanColorStyles(style: string): Record<string, string> {
  const styles: Record<string, string> = {};
  const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  const textColor = sanitizeCssColor(colorMatch?.[1]);
  if (textColor) {
    styles.textColor = textColor;
  }

  const bgMatch = style.match(/(?:^|;)\s*background-color\s*:\s*([^;]+)/i);
  const backgroundColor = sanitizeCssColor(bgMatch?.[1]);
  if (backgroundColor) {
    styles.backgroundColor = backgroundColor;
  }

  return styles;
}

function parseInlineMarkdownChunk(text: string): any[] {
  const result: any[] = [];
  if (!text) return result;

  const regex =
    /(\$((?:\\\$|[^\$])+?)\$|<u>(.+?)<\/u>|<span\b([^>]*)>(.+?)<\/span>|==(.+?)==|\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`|\[\[((?:\\.|[^\]\\\n])+?)\]\]|\[((?:\\.|[^\]\\])+)\]\(([^)]+)\))/gi;
  let lastIndex = 0;
  let match;
  const breakRegex = /<br\s*\/?>/gi;

  function pushPlain(t: string) {
    if (!t) return;
    result.push(t);
  }

  while (true) {
    match = regex.exec(text);
    breakRegex.lastIndex = lastIndex;
    const breakMatch = breakRegex.exec(text);
    if (breakMatch && (!match || breakMatch.index < match.index)) {
      if (breakMatch.index > lastIndex) {
        pushPlain(text.slice(lastIndex, breakMatch.index));
      }
      result.push({ type: "hardBreak" });
      lastIndex = breakMatch.index + breakMatch[0].length;
      regex.lastIndex = lastIndex;
      continue;
    }
    if (!match) break;
    if (match.index > lastIndex) {
      pushPlain(text.slice(lastIndex, match.index));
    }

    if (match[2] !== undefined) {
      pushPlain(`$${match[2]}$`);
    } else if (match[3] !== undefined) {
      result.push(...applyStyles(parseInlineMarkdown(match[3]), { underline: true }));
    } else if (match[4] !== undefined && match[5] !== undefined) {
      const styleAttribute = match[4].match(
        /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i,
      );
      if (styleAttribute) {
        const styles = parseSpanColorStyles(
          styleAttribute[1] ?? styleAttribute[2] ?? "",
        );
        result.push(...applyStyles(parseInlineMarkdown(match[5]), styles));
      } else {
        result.push(...parseInlineMarkdown(match[5]));
      }
    } else if (match[6] !== undefined) {
      result.push(...applyStyles(parseInlineMarkdown(match[6]), { backgroundColor: "yellow" }));
    } else if (match[7] !== undefined) {
      result.push(...applyStyles(parseInlineMarkdown(match[7]), { bold: true }));
    } else if (match[8] !== undefined) {
      result.push(...applyStyles(parseInlineMarkdown(match[8]), { italic: true }));
    } else if (match[9] !== undefined) {
      result.push(...applyStyles(parseInlineMarkdown(match[9]), { strike: true }));
    } else if (match[10] !== undefined) {
      result.push({ type: "text", text: match[10], styles: { code: true } });
    } else if (match[11] !== undefined) {
      const mention = pageMentionFromWikiLink(match[11]);
      if (mention) {
        result.push({
          type: "pageMention",
          props: mention,
        });
      } else {
        pushPlain(match[0]);
      }
    } else if (match[12] !== undefined && match[13] !== undefined) {
      const label = match[12].replace(/\\([\\[\]])/g, "$1");
      const mention = pageMentionFromMarkdownLink(label, match[13]);
      if (mention) {
        result.push({
          type: "pageMention",
          props: mention,
        });
      } else {
        result.push({
          type: "link",
          href: match[13],
          content: toLinkContent(parseInlineMarkdown(match[12])),
        });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    pushPlain(text.slice(lastIndex));
  }

  return result.length > 0 ? result : [text];
}

export function parseInlineMarkdown(text: string): any[] {
  return parseInlineMarkdownChunk(text);
}
