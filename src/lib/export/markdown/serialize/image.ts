export function serializeImage(block: any): string {
  const props = block.props ?? block.attrs ?? {};
  const url = String(props.url || props.src || "");
  const altText = String(typeof props.alt === "string" ? props.alt : props.name || "");
  const alt = altText.replace(/[\r\n]+/g, " ")
    .replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
  const metadata: string[] = [];
  const width = props.previewWidth ?? props.width;
  if (width != null && Number.isFinite(Number(width))) metadata.push(`width=${width}`);
  if (props.textAlignment && props.textAlignment !== "left") metadata.push(`align=${props.textAlignment}`);
  // alt 是图片内容描述；caption 是可见说明；name 是附件文件名，分别保留。
  metadata.push(`goose-image=${encodeURIComponent(JSON.stringify({
    v: 1, alt: altText, name: props.name || "", caption: props.caption || "", captionSource: props.captionSource || "",
    backgroundColor: props.backgroundColor || "default", showPreview: props.showPreview !== false,
  }))}`);
  const destination = /[()\s<>]/.test(url) ? `<${url.replace(/</g, "%3C").replace(/>/g, "%3E")}>` : url;
  return `![${alt}](${destination}){${metadata.join(" ")}}`;
}
