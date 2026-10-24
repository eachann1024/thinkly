import { parseFragment } from "parse5";
import postcss from "postcss";
import { readFileSync } from "node:fs";
import { ownBlockHandleContent } from "@/components/editor/core/blockHandleDom";
import { createChecker } from "./lib/check";

// Structure captured from the running BlockNote editor: Decoration attrs are on blockOuter;
// React NodeViews insert react-renderer between blockContainer and their own content.
type Dom = any;
function elements(node: Dom): Dom[] {
  return (node.childNodes ?? []).flatMap((child: Dom) => child.tagName ? [child, ...elements(child)] : elements(child));
}
function atom(node: Dom, selector: string): boolean {
  if (!node?.tagName || selector.includes(":")) return false;
  const attrs = new Map((node.attrs ?? []).map((attr: any) => [attr.name, attr.value]));
  for (const match of selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)) {
    if (!attrs.has(match[1]) || (match[2] !== undefined && attrs.get(match[1]) !== match[2])) return false;
  }
  const classes = String(attrs.get("class") ?? "").split(/\s+/);
  for (const match of selector.matchAll(/\.([\w-]+)/g)) if (!classes.includes(match[1])) return false;
  const tag = selector.replace(/\[[^\]]*\]|\.[\w-]+/g, "");
  return !tag || tag === node.tagName;
}
function matches(node: Dom, selector: string): boolean {
  const tokens = selector.replace(/\s*>\s*/g, " > ").trim().split(/\s+/);
  const visit = (current: Dom, index: number): boolean => {
    if (!atom(current, tokens[index])) return false;
    if (!index) return true;
    if (tokens[index - 1] === ">") return visit(current.parentNode, index - 2);
    for (let parent = current.parentNode; parent; parent = parent.parentNode) if (visit(parent, index - 1)) return true;
    return false;
  };
  return visit(node, tokens.length - 1);
}
function stageSelectors(path: string, key: string, property: string, value?: string): string[] {
  const selectors: string[] = [];
  postcss.parse(readFileSync(path, "utf8")).walkRules((rule) => {
    if (!rule.nodes.some((node) => node.type === "decl" && node.prop === property && (!value || node.value === value))) return;
    selectors.push(...rule.selector.split(",").map((selector) => selector.trim()).filter((selector) => selector.includes(key)));
  });
  return selectors;
}
function dom(react: boolean, type: string, action: string, attrs: string) {
  const content = (id: string) => {
    const html = `<div class="bn-block-content" data-content-type="${type}" data-probe="${id}-content"><div class="${action}" data-probe="${id}-action"></div></div>`;
    return react ? `<div class="react-renderer node-${type}">${html}</div>` : html;
  };
  const block = (id: string, attributes: string, children = "") => `<div class="bn-block-outer" data-node-type="blockOuter" data-id="${id}" ${attributes}><div class="bn-block" data-node-type="blockContainer" data-id="${id}">${content(id)}${children}</div></div>`;
  const tree = parseFragment(`<div class="bn-editor" data-goose-block-toolbar-sequence="true">${block("target", attrs)}${block("parent", attrs, `<div class="bn-block-group">${block("nested", "")}</div>`)}${block("other", "")}</div>`);
  const all = elements(tree);
  for (const node of all) {
    node.querySelectorAll = (selector: string) => elements(node).filter((child) => atom(child, selector));
    node.closest = (selector: string) => { for (let current: Dom = node; current; current = current.parentNode) if (atom(current, selector)) return current; return null; };
  }
  const probe = (name: string) => all.find((node) => node.attrs?.some((attr: any) => attr.name === "data-probe" && attr.value === name));
  const container = all.find((node) => atom(node, '[data-node-type="blockContainer"][data-id="target"]'));
  return { probe, container };
}

export default function run() {
  const checker = createChecker();
  const { check } = checker;
  const highlight = stageSelectors("src/components/editor/core/block-handle.css", "data-goose-empty-handle-hover", "background");
  for (const react of [false, true]) {
    const name = react ? "React包装" : "普通";
    const empty = dom(react, "paragraph", "empty-action", 'data-goose-empty-handle-hover="true"');
    check(`${name}空行高亮匹配外层Decoration下的自身正文`, highlight.some((selector) => matches(empty.probe("target-content"), selector)));
    check(`${name}空行背景不会从父块泄漏给嵌套和相邻块`, ["nested-content", "other-content"].every((id) => !highlight.some((selector) => matches(empty.probe(id), selector))));
    check(`${name}活节点定位跨包装取自身content`, ownBlockHandleContent(empty.container) === empty.probe("target-content"));
    for (const [type, action, path] of [
      ["codeBlock", "goose-code-hover-actions", "src/pages/workspace/styles/editor-base/code/toolbar.css"],
      ["file", "goose-file-block-actions", "src/pages/workspace/styles/editor-base/files.css"],
    ]) {
      const ready = stageSelectors(path, 'data-goose-block-hover="toolbar"', "opacity", "1");
      const suppressed = stageSelectors(path, "data-goose-block-tools-suppressed", "opacity", "0");
      const active = dom(react, type, action, 'data-goose-block-hover="toolbar"');
      const waiting = dom(react, type, action, 'data-goose-block-hover="handle"');
      const locked = dom(react, type, action, 'data-goose-block-tools-suppressed="true"');
      check(`${name}${type}工具栏仅在自身外层toolbar阶段显现`, ready.some((selector) => matches(active.probe("target-action"), selector)) && !ready.some((selector) => matches(waiting.probe("target-action"), selector)));
      check(`${name}${type}阶段不串到嵌套或相邻块`, ["nested-action", "other-action"].every((id) => !ready.some((selector) => matches(active.probe(id), selector))));
      check(`${name}${type}块菜单压制规则匹配实际DOM`, suppressed.some((selector) => matches(locked.probe("target-action"), selector)));
    }
  }
  return checker.failed;
}
