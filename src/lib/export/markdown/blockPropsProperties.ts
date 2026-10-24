export type MarkdownBlock = {
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: MarkdownBlock[];
  [key: string]: unknown;
};

export type PersistedBlockProps = {
  textAlignment?: "left" | "center" | "right";
  textColor?: string;
  backgroundColor?: string;
};

const KNOWN_COLORS = new Set([
  "default", "gray", "brown", "red", "orange", "yellow", "green", "blue", "purple", "pink",
]);
const SAFE_CSS_COLOR = /^(?:#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla)\([0-9.%\s,/-]+\)|var\(--[A-Za-z0-9_-]+\)|[A-Za-z]{1,32})$/;
export const INLINE_BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
  "toggleListItem",
  "quote",
  "callout",
]);

export function sanitizeCssColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const color = value.trim();
  return KNOWN_COLORS.has(color) || SAFE_CSS_COLOR.test(color) ? color : undefined;
}

export function restorePersistedBlockProps(props: Record<string, unknown>): PersistedBlockProps {
  const metadata: PersistedBlockProps = {};
  if (props.textAlignment === "left" || props.textAlignment === "center" || props.textAlignment === "right") {
    metadata.textAlignment = props.textAlignment;
  }
  const textColor = sanitizeCssColor(props.textColor);
  if (textColor) metadata.textColor = textColor;
  const backgroundColor = sanitizeCssColor(props.backgroundColor);
  if (backgroundColor) metadata.backgroundColor = backgroundColor;
  return metadata;
}

export function pickPersistedBlockProps(
  props: Record<string, unknown> | undefined,
): PersistedBlockProps {
  const metadata: PersistedBlockProps = {};
  if (props?.textAlignment === "center" || props?.textAlignment === "right") {
    metadata.textAlignment = props.textAlignment;
  }
  const textColor = sanitizeCssColor(props?.textColor);
  if (textColor && textColor !== "default") metadata.textColor = textColor;
  const backgroundColor = sanitizeCssColor(props?.backgroundColor);
  if (backgroundColor && backgroundColor !== "default") {
    metadata.backgroundColor = backgroundColor;
  }
  return metadata;
}
