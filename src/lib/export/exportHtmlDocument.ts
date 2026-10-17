import { createTranslator, getLocale, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/export/exportHtmlDocument.ts#localMessages:1">`
zh-Hans:
  contents: "目录"
  outline: "文档目录"
  collapse: "收起"
en:
  contents: "Contents"
  outline: "Document outline"
  collapse: "Collapse"
`;
const uiText = createTranslator(localMessages);
import { readThemeSurfaceSnapshot } from "@/lib/themeSurfaceSnapshot";
import {
  EXPORT_HTML_HEAD_ASSETS,
  EXPORT_HTML_BODY_SCRIPTS,
} from "./blocknoteSerializer";
import { getExportHtmlCss } from "./exportHtmlCss";

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function wrapExportEditorHtml(bodyHtml: string): string {
  return `<div class="workspace-editor-surface">
<div class="bn-container bn-mantine">
<div class="bn-root" data-color-scheme="light">
<div class="ProseMirror bn-editor bn-default-styles">
${bodyHtml}
</div>
</div>
</div>
</div>`;
}

const PAGE_CHROME_CSS = `
html { color-scheme: light; }
body {
  font-family: var(--font-default);
  max-width: 820px;
  margin: 0 auto;
  padding: 2rem;
  line-height: 1.65;
  color: var(--goose-text-primary);
  background: #ffffff;
}
#export-content > h1 {
  font-size: 2em;
  line-height: 1.3;
  margin: 0 0 0.8em;
  scroll-margin-top: 1.5rem;
}
img, video { max-width: 100%; height: auto; }
.katex-display { overflow-x: auto; overflow-y: hidden; }
.export-toc { position: fixed; z-index: 1; top: 1rem; left: 1rem; width: min(17rem, calc(100vw - 2rem)); max-height: calc(100vh - 2rem); overflow: auto; box-sizing: border-box; padding: 0.45rem; border: 1px solid var(--export-control-border); border-radius: var(--export-control-radius); background: var(--export-control-surface); box-shadow: 0 8px 24px rgba(31, 35, 40, 0.12); font-size: 0.875rem; }
.export-toc__header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.export-toc__title { margin: 0; color: var(--export-control-fg); font-size: 0.875rem; font-weight: 600; }
.export-toc__toggle { appearance: none; border: 0; border-radius: var(--export-control-radius); padding: 0.25rem 0.45rem; background: var(--export-control-hover); color: var(--export-control-fg); cursor: pointer; font: inherit; line-height: 1.25; }
.export-toc__toggle:hover { background: var(--export-control-selected); }
.export-toc__list { margin: 0.4rem 0 0; padding: 0; list-style: none; }
.export-toc__item + .export-toc__item { margin-top: var(--export-control-gap); }
.export-toc__link { display: block; overflow: hidden; padding: 0.18rem 0.35rem; border-radius: var(--export-control-radius); color: var(--export-control-muted); text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
.export-toc__link:hover { background: var(--export-control-hover); color: var(--export-control-fg); }
.export-toc__item--h2 { padding-left: 0.75rem; }
.export-toc__item--h3 { padding-left: 1.5rem; }
.export-toc__item--h4 { padding-left: 2.25rem; }
.export-toc.is-collapsed { width: auto; overflow: visible; }
.export-toc.is-collapsed .export-toc__title, .export-toc.is-collapsed .export-toc__list { display: none; }
.export-toc__toggle:focus-visible, .export-toc__link:focus-visible { outline: 2px solid var(--export-control-fg); outline-offset: -2px; }
@media (max-width: 1100px) { .export-toc { position: static; width: 100%; max-height: none; margin: 0 0 1.5rem; } .export-toc.is-collapsed { width: fit-content; } }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
`;

export async function renderExportHtml(
  title: string,
  bodyHtml: string,
  includeBodyH1 = true,
): Promise<string> {
  const bodyHeading = includeBodyH1
    ? `<h1>${escapeHtmlText(title)}</h1>\n`
    : "";
  const editorCss = await getExportHtmlCss();
  const theme = readThemeSurfaceSnapshot();
  const chromeTokens = `:root { --export-control-surface:${theme.background}; --export-control-fg:${theme.foreground}; --export-control-muted:${theme.secondary}; --export-control-border:${theme.border}; --export-control-hover:${theme.hover}; --export-control-selected:${theme.selected}; --export-control-radius:${theme.radius}; --export-control-gap:0.15rem; }`;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtmlText(title)}</title>
${EXPORT_HTML_HEAD_ASSETS}
<style>
${editorCss}
${chromeTokens}
${PAGE_CHROME_CSS}
</style>
</head>
<body>
<nav class="export-toc" lang="${getLocale()}" aria-label="${escapeHtmlText(uiText("outline"))}">
  <div class="export-toc__header">
    <p class="export-toc__title">${escapeHtmlText(uiText("contents"))}</p>
    <button class="export-toc__toggle" type="button" aria-expanded="true">${escapeHtmlText(uiText("collapse"))}</button>
  </div>
  <ol class="export-toc__list"></ol>
</nav>
<main id="export-content">
${bodyHeading}${wrapExportEditorHtml(bodyHtml)}
</main>
<script>
(() => {
  const toc = document.querySelector('.export-toc');
  const list = toc?.querySelector('.export-toc__list');
  const toggle = toc?.querySelector('.export-toc__toggle');
  const headings = document.querySelectorAll('#export-content h1, #export-content h2, #export-content h3, #export-content h4');
  const usedIds = new Set();
  const makeId = (text) => {
    const base = text.trim().toLowerCase().replace(/[^\\w\\u4e00-\\u9fff]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
    let id = base;
    let suffix = 2;
    while (usedIds.has(id) || document.getElementById(id)) id = base + '-' + suffix++;
    return id;
  };
  headings.forEach((heading) => {
    const text = heading.textContent?.trim();
    if (!text || !list) return;
    const existingId = heading.id;
    const id = existingId && !usedIds.has(existingId) ? existingId : makeId(text);
    heading.id = id;
    usedIds.add(id);
    const item = document.createElement('li');
    item.className = 'export-toc__item export-toc__item--' + heading.tagName.toLowerCase();
    const link = document.createElement('a');
    link.className = 'export-toc__link';
    link.href = '#' + encodeURIComponent(id);
    link.textContent = text;
    item.append(link);
    list.append(item);
  });
  if (!list?.children.length) toc?.remove();
  toggle?.addEventListener('click', () => {
    const collapsed = toc?.classList.toggle('is-collapsed') ?? false;
    toggle.textContent = collapsed ? ${JSON.stringify(uiText("contents"))} : ${JSON.stringify(uiText("collapse"))};
    toggle.setAttribute('aria-expanded', String(!collapsed));
  });
})();
</script>
${EXPORT_HTML_BODY_SCRIPTS}
</body>
</html>`;
}
