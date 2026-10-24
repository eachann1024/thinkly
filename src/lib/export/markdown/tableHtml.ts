import { documentTextColors } from "@/lib/textColors";
import { sanitizeCssColor } from "./blockPropsProperties";
import { sanitizePageMentionProps, pageMentionLabel, serializePageMentionHref, pageMentionFromMarkdownLink, PAGE_MENTION_HREF_SCHEME } from "@/components/editor/inline/pageMention";
import { dataAttr, readDataAttr } from "./persistedNames";
import { escapeHtmlAttribute } from "./serialize/inline";

const backgrounds: Record<string, string> = {
  gray: "#ebeced", brown: "#e9e5e3", red: "#fbe4e4", orange: "#f6e9d9",
  yellow: "#fbf3db", green: "#ddedea", blue: "#ddebf1", purple: "#eae4f2", pink: "#f4dfeb",
};
export const tableHtmlEscape = (text: string) => escapeHtmlAttribute(text);

const MENTION_SCHEME = PAGE_MENTION_HREF_SCHEME.replace(/:$/, "").toLowerCase();

/**
 * 单元格链接只保留 http(s)、mailto、无协议相对地址，以及本应用的页面引用。
 * 先去掉控制字符，避免协议名里夹换行或空字符后绕过判断。
 */
export function sanitizeTableHref(value: string): string | null {
  const href = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!href) return "";
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(href);
  if (!match) return href;
  const scheme = match[1].toLowerCase();
  if (scheme === "http" || scheme === "https" || scheme === "mailto" || scheme === MENTION_SCHEME) return href;
  return null;
}

export function tableColorStyle(props: Record<string, unknown>): string {
  const styles: string[] = [];
  const text = sanitizeCssColor(props.textColor);
  const background = sanitizeCssColor(props.backgroundColor);
  if (text && text !== "default") styles.push(`color:${documentTextColors("light")[text] ?? text}`);
  if (background && background !== "default") styles.push(`background-color:${backgrounds[background] ?? background}`);
  if (["left", "center", "right"].includes(String(props.textAlignment))) styles.push(`text-align:${props.textAlignment}`);
  return styles.join(";");
}

/** HTML 内容本身是唯一文本来源；data 属性仅保留命名色和页面引用等语义。 */
export function tableInlineHtml(content: any): string {
  if (typeof content === "string") return tableHtmlEscape(content).replace(/\n/g, "<br>");
  if (!content) return "";
  if (!Array.isArray(content)) return tableInlineHtml(content.content ?? []);
  return content.map((item: any) => {
    if (typeof item === "string") return tableInlineHtml(item);
    if (!item) return "";
    if (item.type === "hardBreak") return "<br>";
    if (item.type === "paragraph") return tableInlineHtml(item.content);
    if (item.type === "link") {
      const inner = tableInlineHtml(item.content);
      const href = sanitizeTableHref(typeof item.href === "string" ? item.href : "");
      if (href == null) return inner;
      return `<a href="${tableHtmlEscape(href)}">${inner}</a>`;
    }
    if (item.type === "pageMention") {
      const props = sanitizePageMentionProps(item);
      return props ? `<a href="${tableHtmlEscape(serializePageMentionHref(props))}" ${dataAttr("page-mention")}="${encodeURIComponent(JSON.stringify(props))}">${tableHtmlEscape(pageMentionLabel(props))}</a>` : "";
    }
    let text = tableInlineHtml(item.text || "");
    const styles = item.styles || {};
    for (const [name, tag] of [["bold", "strong"], ["italic", "em"], ["underline", "u"], ["strike", "del"], ["code", "code"]]) {
      if (styles[name]) text = `<${tag}>${text}</${tag}>`;
    }
    const color = sanitizeCssColor(styles.textColor);
    const background = sanitizeCssColor(styles.backgroundColor);
    if (color || background) {
      text = `<span${color ? ` ${dataAttr("text-color")}="${tableHtmlEscape(color)}"` : ""}${background ? ` ${dataAttr("background-color")}="${tableHtmlEscape(background)}"` : ""} style="${tableHtmlEscape(tableColorStyle(styles))}">${text}</span>`;
    }
    return text;
  }).join("");
}

export function parseTableInlineHtml(node: Node, styles: Record<string, unknown> = {}): any[] {
  if (node.nodeType === 3) return node.textContent ? [{ type: "text", text: node.textContent, styles }] : [];
  // 用 nodeType 而不是 instanceof Element，跨 realm 的节点（以及验收脚本里的 HTML 解析）同样能走进来。
  if (node.nodeType !== 1) return [];
  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  if (["script", "style", "iframe", "object"].includes(tag)) return [];
  if (tag === "br") return [{ type: "text", text: "\n", styles }];
  const extra = { ...styles };
  const mark = ({ strong: "bold", b: "bold", em: "italic", i: "italic", u: "underline", del: "strike", s: "strike", code: "code" } as Record<string, string>)[tag];
  if (mark) extra[mark] = true;
  for (const property of ["textColor", "backgroundColor"] as const) {
    const color = sanitizeCssColor(readDataAttr(element, property === "textColor" ? "text-color" : "background-color"));
    if (color) extra[property] = color;
  }
  const mention = readDataAttr(element, "page-mention");
  if (mention) {
    try {
      const props = sanitizePageMentionProps(JSON.parse(decodeURIComponent(mention)));
      if (props) return [{ type: "pageMention", props: { ...props, title: (element.textContent || "").trim().replace(/^@/, "") || props.title } }];
    } catch { /* 无效引用继续保留可见文本。 */ }
  }
  const children = Array.from(element.childNodes).flatMap((child) => parseTableInlineHtml(child, extra));
  if (tag === "a") {
    const href = element.getAttribute("href") || "";
    const props = pageMentionFromMarkdownLink(element.textContent || "", href);
    if (props) return [{ type: "pageMention", props }];
    const safe = sanitizeTableHref(href);
    const text = children.filter((child) => child.type === "text");
    if (safe == null) return text;
    return [{ type: "link", href: safe, content: text }];
  }
  return children;
}
