import { loadMermaid } from "./loadMermaid";
import { persistPreview, previewCacheKey, readPersistedPreview } from "./mermaidPersistentCache";
import { getMermaidInitConfig, stripMermaidInitDirectives, type MermaidInitOptions } from "./mermaidTheme";
import { tryRenderMermaidTimeline } from "./timelineSvg";

const MAX_ENTRIES = 24;
const MAX_BYTES = 4 * 1024 * 1024;
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
let bytes = 0;
let renderQueue: Promise<unknown> = Promise.resolve();
let nextInstance = 0;
const rendererIdentity = crypto.randomUUID();

/** Give every mounted/exported SVG its own IDs, including markers and CSS selectors. */
function instantiate(svg: string): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(svg, "image/svg+xml");
  // Mermaid's HTML labels may contain <br> or named HTML entities that are not XML.
  // Never insert Chromium's XML error document (including its page-wide CSS) into the editor.
  const root = document.documentElement.localName === "svg"
    ? document.documentElement
    : parser.parseFromString(svg, "text/html").querySelector("svg");
  if (!root) throw new Error("图表预览不是有效的 SVG");
  const elements = [root, ...root.querySelectorAll("*")];
  const prefix = `goose-diagram-${rendererIdentity}-${++nextInstance}-`;
  const ids = new Map<string, string>();
  for (const element of elements) {
    const id = element.getAttribute("id");
    if (!id) continue;
    ids.set(id, `${prefix}${ids.size}`);
  }
  // SVG 的每个属性都要处理引用；匹配器只构建一次，避免属性数 × ID 数重复排序和编译。
  const alternatives = [...ids.keys()].sort((a, b) => b.length - a.length).map(id =>
    [...id].map(char =>
      "^$.*+?()[]{}|".includes(char) || char.charCodeAt(0) === 92
        ? String.fromCharCode(92) + char : char,
    ).join(""),
  );
  const references = alternatives.length
    ? new RegExp(`#(${alternatives.join("|")})(?![A-Za-z0-9_-])`, "g")
    : null;
  const replaceReferences = (text: string) => references
    ? text.replace(references, (_, id: string) => `#${ids.get(id)}`)
    : text;
  for (const element of elements) {
    for (const attribute of [...element.attributes]) {
      if (attribute.name === "id") {
        element.setAttribute("id", ids.get(attribute.value)!);
      } else if (attribute.name === "aria-labelledby" || attribute.name === "aria-describedby") {
        element.setAttribute(attribute.name, attribute.value.split(/\s+/).map(id => ids.get(id) ?? id).join(" "));
      } else {
        element.setAttribute(attribute.name, replaceReferences(attribute.value));
      }
    }
    if (element.tagName === "style") element.textContent = replaceReferences(element.textContent ?? "");
  }
  return new XMLSerializer().serializeToString(root);
}

/** One global queue protects Mermaid's mutable initialize/render configuration. */
export async function renderCachedMermaid(
  source: string,
  options: MermaidInitOptions,
  context: "editor" | "export",
  fontIdentity?: string,
  signal?: AbortSignal,
): Promise<string> {
  if (typeof window !== "undefined" && window.gooseDesktop?.renderMermaidPreview) {
    signal?.throwIfAborted();
    const desktop = window.gooseDesktop;
    const requestId = crypto.randomUUID();
    const cancel = () => desktop.cancelMermaidPreview(requestId);
    signal?.addEventListener("abort", cancel, { once: true });
    try { return await desktop.renderMermaidPreview({ source, options, context, fontIdentity, requestId }); }
    finally { signal?.removeEventListener("abort", cancel); }
  }
  const config = getMermaidInitConfig(options);
  const cleanSource = stripMermaidInitDirectives(source);
  const key = JSON.stringify([context, config, cleanSource, fontIdentity]);
  const cached = cache.get(key);
  if (cached) {
    cache.delete(key);
    cache.set(key, cached);
    return instantiate(cached);
  }
  let request = pending.get(key);
  if (!request) {
    request = renderQueue.then(async () => {
      const storedKey = await previewCacheKey(key);
      const stored = await readPersistedPreview(storedKey);
      if (stored) return stored;
      const timeline = tryRenderMermaidTimeline(cleanSource, options.mode);
      if (timeline) { void persistPreview(storedKey, timeline); return timeline; }
      const mermaid = await loadMermaid();
      mermaid.initialize(config);
      const svg = (await mermaid.render(`goose-template-${++nextInstance}`, cleanSource)).svg;
      void persistPreview(storedKey, svg);
      return svg;
    });
    renderQueue = request.catch(() => {});
    pending.set(key, request);
    void request.then(svg => {
      const entryBytes = (key.length + svg.length) * 2;
      if (entryBytes <= MAX_BYTES) {
        cache.set(key, svg);
        bytes += entryBytes;
        while (cache.size > MAX_ENTRIES || bytes > MAX_BYTES) {
          const oldest = cache.entries().next().value;
          if (!oldest) break;
          cache.delete(oldest[0]);
          bytes -= (oldest[0].length + oldest[1].length) * 2;
        }
      }
    }).finally(() => pending.delete(key)).catch(() => {});
  }
  return instantiate(await request);
}
