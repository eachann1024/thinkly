import { escapeHtmlAttribute } from "./inline";

function serializeMedia(block: any, type: "audio" | "video"): string {
  const props = block.props ?? block.attrs ?? {};
  const escape = (value: string) => escapeHtmlAttribute(value).replace(/\r/g, "&#13;").replace(/\n/g, "&#10;");
  const width = type === "video" ? Number(props.previewWidth) : NaN;
  const widthAttr = Number.isFinite(width) && width > 0 ? ` width="${width}"` : "";
  return `<${type} src="${escape(props.url || props.src || "")}" controls preload="metadata"${widthAttr}></${type}>`;
}

export const serializeAudio = (block: any) => serializeMedia(block, "audio");
export const serializeVideo = (block: any) => serializeMedia(block, "video");
