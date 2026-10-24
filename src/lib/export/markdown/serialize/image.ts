export function imageAltText(props: any): string {
  if (typeof props?.alt === "string" && props.alt) return props.alt;
  if (typeof props?.name === "string" && props.name) return props.name;
  if (typeof props?.caption === "string" && props.caption) return props.caption;
  return "";
}

export function serializeImage(block: any): string {
  const props = block.props ?? block.attrs ?? {};
  const alt = imageAltText(props).replace(/[\r\n]+/g, " ").replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
  const url = String(props.url || props.src || "");
  const destination = /[()\s<>]/.test(url) ? `<${url.replace(/</g, "%3C").replace(/>/g, "%3E")}>` : url;
  return `![${alt}](${destination})`;
}
