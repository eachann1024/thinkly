type Preview = { svg: string; prefix: string; height?: number };
const previews = new Map<string, Preview>();
const MAX_BYTES = 4 * 1024 * 1024;
let bytes = 0;
let instance = 0;
const identity = crypto.randomUUID();

/** Window-local display cache; backend templates and export caches remain independent. */
export function readMermaidPreview(key: string) {
  const preview = previews.get(key);
  if (preview) { previews.delete(key); previews.set(key, preview); }
  return preview;
}

export function rememberMermaidPreview(key: string, svg: string) {
  // Renderer stamps its unique namespace; changing it is a string operation, not an SVG reparse.
  const prefix = svg.match(/data-goose-diagram-prefix="(goose-diagram-[a-f0-9-]+-\d+-)"/)?.[1];
  if (!prefix) return;
  const size = (key.length + svg.length) * 2;
  if (size > MAX_BYTES) return;
  const old = previews.get(key);
  if (old) bytes -= (key.length + old.svg.length) * 2;
  previews.delete(key);
  previews.set(key, { svg, prefix, height: old?.height });
  bytes += size;
  while (previews.size > 24 || bytes > MAX_BYTES) {
    const first = previews.entries().next().value;
    if (!first) break;
    previews.delete(first[0]);
    bytes -= (first[0].length + first[1].svg.length) * 2;
  }
}

export function instantiateMermaidPreview(preview: Preview) {
  return preview.svg.replaceAll(preview.prefix, `goose-diagram-${identity}-${++instance}-`);
}

export function rememberMermaidHeight(key: string, height: number) {
  const preview = previews.get(key);
  if (preview && Number.isFinite(height) && height > 0 && height <= 100000) preview.height = height;
}
