import { dataAttr } from "../persistedNames";
import { escapeHtmlAttribute } from "./inline";

function serializeMedia(block: any, type: "audio" | "video"): string {
  const props = block.props ?? block.attrs ?? {};
  const escape = (value: string) => escapeHtmlAttribute(value).replace(/\r/g, "&#13;").replace(/\n/g, "&#10;");
  const attr = (name: string, value: unknown) => typeof value === "string" && value
    ? ` ${name}="${escape(value)}"` : "";
  let metadata = attr(dataAttr("name"), props.name) + attr(dataAttr("caption"), props.caption);
  metadata += attr("data-background-color", props.backgroundColor);
  if (props.showPreview === false) metadata += ` ${dataAttr("show-preview")}="false"`;
  if (type === "video") {
    const width = Number(props.previewWidth);
    if (Number.isFinite(width) && width > 0) metadata += ` width="${width}"`;
    metadata += attr("data-text-alignment", props.textAlignment);
  }
  return `<${type} src="${escape(props.url || props.src || "")}" controls preload="metadata"${metadata}></${type}>`;
}

export const serializeAudio = (block: any) => serializeMedia(block, "audio");
export const serializeVideo = (block: any) => serializeMedia(block, "video");
