const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: "\u00a0" };

type HtmlNode = HtmlEl | { nodeType: 3 | 8; textContent: string };

function decode(text: string) {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (all, body: string) => {
    if (body[0] !== "#") return NAMED[body] ?? all;
    const code = body[1] === "x" || body[1] === "X" ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
    return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : all;
  });
}

function parseAttrs(source: string) {
  const attrs = new Map<string, string>();
  for (const match of source.matchAll(/([^\s=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    const name = match[1].toLowerCase();
    if (!name) continue;
    attrs.set(name, decode(match[2] ?? match[3] ?? match[4] ?? ""));
  }
  return attrs;
}

class HtmlEl {
  nodeType = 1;
  tagName: string;
  childNodes: HtmlNode[] = [];
  private attr: Map<string, string>;

  constructor(tag: string, attr: Map<string, string>) {
    this.tagName = tag.toUpperCase();
    this.attr = attr;
  }

  getAttribute(name: string) {
    return this.attr.has(name.toLowerCase()) ? this.attr.get(name.toLowerCase())! : null;
  }

  hasAttribute(name: string) {
    return this.attr.has(name.toLowerCase());
  }

  get attributes() {
    return [...this.attr.entries()].map(([name, value]) => ({ name, value }));
  }

  get textContent() {
    return this.childNodes.map((node) => node.textContent ?? "").join("");
  }

  get style() {
    const style = this.getAttribute("style") || "";
    let width = "";
    for (const part of style.split(";")) {
      const [name, ...rest] = part.split(":");
      if (name?.trim().toLowerCase() === "width") width = rest.join(":").trim();
    }
    return { width };
  }

  private span(name: string) {
    const raw = this.getAttribute(name);
    const value = Number(raw);
    return raw && Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
  }

  get colSpan() { return this.span("colspan"); }
  get rowSpan() { return this.span("rowspan"); }

  get cells() {
    return this.childNodes.filter((node): node is HtmlEl => node.nodeType === 1 && (node.tagName === "TD" || node.tagName === "TH"));
  }

  get rows() {
    const rows: HtmlEl[] = [];
    const walk = (el: HtmlEl) => {
      for (const child of el.childNodes) {
        if (child.nodeType !== 1) continue;
        if (child.tagName === "TABLE") continue;
        if (child.tagName === "TR") rows.push(child);
        else walk(child);
      }
    };
    walk(this);
    return rows;
  }

  descendants(): HtmlEl[] {
    const found: HtmlEl[] = [];
    for (const child of this.childNodes) {
      if (child.nodeType !== 1) continue;
      found.push(child, ...child.descendants());
    }
    return found;
  }

  querySelectorAll(selector: string): HtmlEl[] {
    if (selector === "*") return this.descendants();
    if (selector === "table") return this.descendants().filter((el) => el.tagName === "TABLE");
    if (selector === ":scope > colgroup > col") {
      return this.childNodes.filter((node): node is HtmlEl => node.nodeType === 1 && node.tagName === "COLGROUP")
        .flatMap((group) => group.childNodes.filter((node): node is HtmlEl => node.nodeType === 1 && node.tagName === "COL"));
    }
    return [];
  }

  querySelector(selector: string) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

function parseElement(html: string, index: number): { node: HtmlEl; index: number } {
  const end = html.indexOf(">", index);
  const raw = html.slice(index + 1, end === -1 ? html.length : end);
  const tag = (/^([A-Za-z][\w:-]*)/.exec(raw)?.[1] || "unknown").toLowerCase();
  const el = new HtmlEl(tag, parseAttrs(raw.slice(tag.length)));
  const next = end === -1 ? html.length : end + 1;
  if (end === -1 || /\/\s*$/.test(raw) || VOID.has(tag)) return { node: el, index: next };
  const inner = parseNodes(html, next, tag);
  el.childNodes = inner.nodes;
  return { node: el, index: inner.index };
}

function parseNodes(html: string, index: number, stop: string | null): { nodes: HtmlNode[]; index: number } {
  const nodes: HtmlNode[] = [];
  while (index < html.length) {
    if (html.startsWith("<!--", index)) {
      const end = html.indexOf("-->", index + 4);
      nodes.push({ nodeType: 8, textContent: html.slice(index + 4, end === -1 ? html.length : end) });
      index = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith("</", index)) {
      const end = html.indexOf(">", index);
      const name = html.slice(index + 2, end === -1 ? html.length : end).trim().split(/\s/)[0]?.toLowerCase();
      const next = end === -1 ? html.length : end + 1;
      if (!stop || name === stop) return { nodes, index: next };
      index = next;
      continue;
    }
    if (html[index] === "<") {
      const parsed = parseElement(html, index);
      nodes.push(parsed.node);
      index = parsed.index;
      continue;
    }
    const next = html.indexOf("<", index);
    nodes.push({ nodeType: 3, textContent: decode(html.slice(index, next === -1 ? html.length : next)) });
    index = next === -1 ? html.length : next;
  }
  return { nodes, index };
}

export function installHtmlDom() {
  const scope = globalThis as { DOMParser?: unknown };
  if (typeof scope.DOMParser === "function") return;
  scope.DOMParser = class DOMParser {
    parseFromString(html: string) {
      const body = new HtmlEl("body", new Map());
      body.childNodes = parseNodes(html, 0, null).nodes;
      const head = new HtmlEl("head", new Map());
      return {
        head,
        body,
        querySelector: (selector: string) => body.querySelector(selector),
        querySelectorAll: (selector: string) => body.querySelectorAll(selector),
      };
    }
  };
}
