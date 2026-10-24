const GENERATED_IMAGE_NAME_RE =
  /^image(?:[-_ ]?\d+| \(\d+\))?\.(?:png|jpe?g|gif|webp|svg|avif|bmp)$/i;
const GENERATED_HASH_IMAGE_NAME_RE =
  /^(?:file|image|clipboard|pasted-image)[-_](?:[a-f0-9]{16,64}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})\.(?:png|jpe?g|gif|webp|svg|avif|bmp)$/i;

export function isGeneratedDataImageName(
  value: unknown,
  _url?: unknown,
): boolean {
  if (typeof value !== "string") return false;
  const name = value.trim();
  return GENERATED_IMAGE_NAME_RE.test(name) || GENERATED_HASH_IMAGE_NAME_RE.test(name);
}

export function normalizeParsedImageProps(
  parsed: Record<string, unknown>,
): Record<string, unknown> {
  if (parsed.captionSource !== "generated" || !isGeneratedDataImageName(parsed.caption, parsed.url)) return parsed;
  const caption = String(parsed.caption).trim();
  const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
  return { ...parsed, name: name || caption, caption: "" };
}

export function imageBlockWithoutGeneratedCaption<T extends { props?: unknown }>(
  block: T,
): T {
  const props = block.props;
  if (!props || typeof props !== "object" || Array.isArray(props)) return block;
  const next = normalizeParsedImageProps(props as Record<string, unknown>);
  if (next === props) return block;
  return { ...block, props: next };
}
