import { documentTextColors } from "@/lib/textColors";
import { sanitizeCssColor } from "./blockPropsProperties";
import { sanitizePageMentionProps, pageMentionLabel, serializePageMentionHref, pageMentionFromMarkdownLink } from "@/components/editor/inline/pageMention";
import { dataAttr, readDataAttr } from "./persistedNames";
import { escapeHtmlAttribute } from "./serialize/inline";

const backgrounds: Record<string, string> = {
  gray: "#ebeced", brown: "#e9e5e3", red: "#fbe4e4", orange: "#f6e9d9",
  yellow: "#fbf3db", green: "#ddedea", blue: "#ddebf1", purple: "#eae4f2", pink: "#f4dfeb",
};
export const tableHtmlEscape = (text: string) => escapeHtmlAttribute(text);

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
    if (item.type === "link") return `<a href="${tableHtmlEscape(item.href || "")}">${tableInlineHtml(item.content)}</a>`;
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
  if (!(node instanceof Element)) return [];
  const tag = node.tagName.toLowerCase();
  if (["script", "style", "iframe", "object"].includes(tag)) return [];
  if (tag === "br") return [{ type: "text", text: "\n", styles }];
  const extra = { ...styles };
  const mark = ({ strong: "bold", b: "bold", em: "italic", i: "italic", u: "underline", del: "strike", s: "strike", code: "code" } as Record<string, string>)[tag];
  if (mark) extra[mark] = true;
  for (const property of ["textColor", "backgroundColor"] as const) {
    const color = sanitizeCssColor(readDataAttr(node, property === "textColor" ? "text-color" : "background-color"));
    if (color) extra[property] = color;
  }
  const mention = readDataAttr(node, "page-mention");
  if (mention) {
    try {
      const props = sanitizePageMentionProps(JSON.parse(decodeURIComponent(mention)));
      if (props) return [{ type: "pageMention", props: { ...props, title: (node.textContent || "").trim().replace(/^@/, "") || props.title } }];
    } catch { /* 无效引用继续保留可见文本。 */ }
  }
  const children = Array.from(node.childNodes).flatMap((child) => parseTableInlineHtml(child, extra));
  if (tag === "a") {
    const href = node.getAttribute("href") || "";
    const props = pageMentionFromMarkdownLink(node.textContent || "", href);
    return props ? [{ type: "pageMention", props }] : [{ type: "link", href, content: children.filter((child) => child.type === "text") }];
  }
  return children;
}
