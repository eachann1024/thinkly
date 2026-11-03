import type { CardTheme } from "../themes";
import { resolveCalloutIcon } from "@/components/editor/blocks/callout/calloutIcons";
import { escapeHtml } from "./utils";
import { renderInline } from "./inline";
import { buildBlockStyleAttr } from "./blockStyles";

function extractCodeText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return content == null ? "" : String(content);
  return content
    .map((item: any) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return "";
      if (item.type === "hardBreak") return "\n";
      return typeof item.text === "string" ? item.text : "";
    })
    .join("");
}


const LIST_TYPES = new Set(["bulletListItem", "numberedListItem", "bulletList", "orderedList"]);

function renderListChildren(
  children: any[],
  theme: CardTheme,
  renderBlocks: (blocks: any[], theme: CardTheme) => string,
): string {
  if (!Array.isArray(children) || children.length === 0) return "";
  const parts: string[] = [];
  let start = 0;
  while (start < children.length) {
    const isList = LIST_TYPES.has(children[start]?.type);
    let end = start + 1;
    while (end < children.length && LIST_TYPES.has(children[end]?.type) === isList) end += 1;
    const html = renderBlocks(children.slice(start, end), theme);
    // 列表自带缩进；只有连续的非列表子内容需要额外的容器。
    if (html) parts.push(isList ? html : `<div class="nested-children">${html}</div>`);
    start = end;
  }
  return parts.join("");
}

export function renderTextBlock(
  block: any, theme: CardTheme,
  renderBlock: (block: any, theme: CardTheme) => string,
  renderBlocks: (blocks: any[], theme: CardTheme) => string,
): string {
  if (!block || typeof block !== "object") return "";

  const inlineHtml = renderInline(block.content, theme);
  const styleAttr = buildBlockStyleAttr(block, theme);

  function renderChildren(block: any, theme: CardTheme, className = "nested-children"): string {
    const children = block?.children;
    if (!Array.isArray(children) || children.length === 0) return "";
    const inner = renderBlocks(children, theme);
    if (!inner) return "";
    return `<div class="${className}">${inner}</div>`;
  }

  switch (block.type) {
    case "heading": {
      const level = Math.min(Math.max(Number(block.props?.level) || 1, 1), 3);
      return `<h${level}${styleAttr}>${inlineHtml}</h${level}>${renderChildren(block, theme)}`;
    }

    case "bulletListItem": {
      const childHtml = renderListChildren(block.children, theme, renderBlocks);
      return `<li${styleAttr}>${inlineHtml || ""}${childHtml}</li>`;
    }

    case "numberedListItem": {
      const childHtml = renderListChildren(block.children, theme, renderBlocks);
      const value = Number(block.props?.start);
      const valueAttr =
        Number.isInteger(value) && value > 0 ? ` value="${value}"` : "";
      return `<li${valueAttr}${styleAttr}>${inlineHtml || ""}${childHtml}</li>`;
    }

    case "checkListItem": {
      const checked = !!block.props?.checked;
      const checkboxClass = checked ? "task-checkbox checked" : "task-checkbox";
      const itemClass = checked ? "task-item checked" : "task-item";
      const item = `<div class="${itemClass}"${styleAttr}><div class="task-checkbox-wrap"><div class="${checkboxClass}"></div></div><span class="task-text">${inlineHtml}</span></div>`;
      return `${item}${renderChildren(block, theme)}`;
    }

    case "codeBlock": {
      const lang = (block.props?.language || "").trim();
      const codeStr = escapeHtml(extractCodeText(block.content));
      const wrap = block.props?.wrap === true;
      const showLang = lang && lang !== "text" && lang !== "plain";
      const preClass = wrap ? ' class="code-wrap"' : "";
      const dataAttrs = lang ? ` data-lang="${escapeHtml(lang)}"` : "";
      const langHtml = showLang
        ? `<div class="code-lang">${escapeHtml(lang)}</div>`
        : "";
      return `<div class="code-block"${dataAttrs}>${langHtml}<pre${preClass}><code${lang ? ` class="language-${escapeHtml(lang)}"` : ""}>${codeStr}</code></pre></div>`;
    }

    case "quote": {
      return `<blockquote${styleAttr}>${inlineHtml}</blockquote>${renderChildren(block, theme)}`;
    }

    case "paragraph": {
      if (!inlineHtml) {
        return `<p class="empty-block" data-empty="true"${styleAttr}><br></p>${renderChildren(block, theme)}`;
      }
      return `<p${styleAttr}>${inlineHtml}</p>${renderChildren(block, theme)}`;
    }

    case "divider": {
      return `<hr />`;
    }

    case "callout": {
      const icon = resolveCalloutIcon(block.props?.icon || block.props?.emoji);
      const childrenHtml = renderChildren(block, theme);
      return `<div class="callout"${styleAttr}><div class="callout-icon">${escapeHtml(icon)}</div><div class="callout-text">${inlineHtml}${childrenHtml}</div></div>`;
    }

    case "bulletList": {
      const items = block.content || block.children || [];
      return `<ul class="bn-list">${(items as any[]).map((item: any) => renderBlock(item, theme)).join("")}</ul>`;
    }

    case "orderedList": {
      const items = block.content || block.children || [];
      const start = Number(block.props?.start ?? block.attrs?.start);
      const startAttr =
        Number.isInteger(start) && start > 1 ? ` start="${start}"` : "";
      return `<ol class="bn-list"${startAttr}>${(items as any[]).map((item: any) => renderBlock(item, theme)).join("")}</ol>`;
    }

    default: {
      const body = inlineHtml ? `<p${styleAttr}>${inlineHtml}</p>` : "";
      return `${body}${renderChildren(block, theme)}`;
    }
  }
}
