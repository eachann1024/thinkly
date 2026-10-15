const GENERATED_IMAGE_NAME_RE =
  /^image(?:[-_ ]?\d+| \(\d+\))?\.(?:png|jpe?g|gif|webp|svg|avif|bmp)$/i;
const GENERATED_HASH_IMAGE_NAME_RE =
  /^(?:file|image|clipboard|pasted-image)[-_](?:[a-f0-9]{16,64}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})\.(?:png|jpe?g|gif|webp|svg|avif|bmp)$/i;

/**
 * 识别自动文件名的形状；仅凭名字不能断定它是自动生成的 caption。
 * 清理调用方还必须验证 captionSource，未知来源与用户说明均保留。
 */
export function isGeneratedDataImageName(
  value: unknown,
  _url?: unknown,
): boolean {
  if (typeof value !== "string") return false;
  const name = value.trim();
  return GENERATED_IMAGE_NAME_RE.test(name) || GENERATED_HASH_IMAGE_NAME_RE.test(name);
}

/**
 * 只清除已有明确自动来源标记的占位说明；普通 figure/Markdown 导入保留原文。
 */
export function normalizeParsedImageProps(
  parsed: Record<string, unknown>,
): Record<string, unknown> {
  if (parsed.captionSource !== "generated" || !isGeneratedDataImageName(parsed.caption, parsed.url)) return parsed;
  const caption = String(parsed.caption).trim();
  const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
  return { ...parsed, name: name || caption, caption: "" };
}

/** 渲染/导出时去掉明确自动来源的占位 caption，不改动用户说明。 */
export function imageBlockWithoutGeneratedCaption<T extends { props?: unknown }>(
  block: T,
): T {
  const props = block.props;
  if (!props || typeof props !== "object" || Array.isArray(props)) return block;
  const next = normalizeParsedImageProps(props as Record<string, unknown>);
  if (next === props) return block;
  return { ...block, props: next };
}
