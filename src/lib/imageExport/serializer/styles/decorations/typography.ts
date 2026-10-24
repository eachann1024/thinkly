import type { CardTheme } from "../../../themes";
import type { CardDecoration, TypeDecoration } from "../../../themes/decorations";
import { svgUrl, wavySvg } from "./svg";

export interface TypeSelectors {
  header: string;
  title: string;
  content: string;
  watermark: string;
  date: string;
}

const TYPE_KINDS = new Set<CardDecoration["kind"]>([
  "title-rule",
  "title-ornament",
  "pen-underline",
  "quote-mark",
  "quote-rule",
  "ink-bleed",
  "misregistration",
  "letterpress",
  "mono-footer",
]);

function isType(decoration: CardDecoration): decoration is TypeDecoration {
  return TYPE_KINDS.has(decoration.kind);
}

function alignMargin(t: CardTheme, top: string): string {
  if (t.titleAlign === "center") return `margin: ${top} auto 0;`;
  if (t.titleAlign === "right") return `margin: ${top} 0 0 auto;`;
  return `margin: ${top} 0 0;`;
}

function headings(sel: TypeSelectors): string {
  return `${sel.content} h1, ${sel.content} h2, ${sel.content} h3`;
}

function rule(
  d: TypeDecoration,
  t: CardTheme,
  sel: TypeSelectors,
  px: (value: number) => string,
): string {
  switch (d.kind) {
    case "title-rule":
      return `${sel.header}::after {
  content: '';
  display: block;
  height: ${px(d.thickness)};
  width: ${d.width ? px(d.width) : "auto"};
  background: ${d.color};
  ${alignMargin(t, px(d.gap))}
}
`;
    case "title-ornament":
      return `${sel.header}::after {
  content: '\\00B7\\2002\\00B7\\2002\\00B7';
  display: block;
  margin-top: ${px(12)};
  font-size: ${px(20)};
  line-height: 1;
  letter-spacing: 0.2em;
  color: ${d.color};
  text-align: ${t.titleAlign};
}
`;
    case "pen-underline":
      return `${sel.header}::after {
  content: '';
  display: block;
  width: ${px(124)};
  height: ${px(10)};
  background: ${svgUrl(wavySvg(d.color))} 0 0 / 100% 100% no-repeat;
  ${alignMargin(t, px(6))}
}
`;
    case "quote-mark":
      return `${sel.content} blockquote {
  position: relative;
  border-left: none;
  padding-left: ${px(30)};
}
${sel.content} blockquote::before {
  content: '\\201C';
  position: absolute;
  left: 0;
  top: ${px(-6)};
  font-family: Georgia, 'Times New Roman', serif;
  font-style: normal;
  font-size: ${px(42)};
  line-height: 1;
  color: ${d.color};
}
`;
    case "quote-rule":
      return `${sel.content} blockquote { border-left: ${px(d.width)} solid ${d.color}; font-style: normal; }
`;
    case "ink-bleed":
      return `${sel.title}, ${headings(sel)} {
  text-shadow: 0.4px 0 0 ${d.color}, 0 0 1px ${d.color};
}
${sel.content} p, ${sel.content} li, ${sel.content} blockquote {
  text-shadow: 0.25px 0 0 ${d.color}, 0 0 0.6px ${d.color};
}
`;
    case "misregistration":
      return `${sel.title} { text-shadow: ${px(2)} ${px(1.5)} 0 ${d.color}; }
${headings(sel)} { text-shadow: ${px(1.5)} ${px(1)} 0 ${d.color}; }
`;
    case "letterpress":
      return `${sel.title}, ${headings(sel)} { text-shadow: 0 1px 0 ${d.highlight}; }
`;
    case "mono-footer":
      return `${sel.watermark} { border-top: 1px ${d.dashed ? "dashed" : "solid"} ${d.color}; }
${sel.date} { font-family: ${t.codeFont}; letter-spacing: 0.02em; }
`;
  }
}

export function buildTypeRules(
  t: CardTheme,
  sel: TypeSelectors,
  px: (value: number) => string,
): string {
  return (t.decorations ?? [])
    .filter(isType)
    .map((decoration) => rule(decoration, t, sel, px))
    .join("");
}
