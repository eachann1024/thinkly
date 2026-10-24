export function serializeFile(block: any): string {
  const props = block.props ?? block.attrs ?? {};
  const name = String(props.name || "文件").replace(/[\r\n]+/g, " ").replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
  const url = String(props.url || "");
  const destination = /[()\s<>]/.test(url) ? `<${url.replace(/</g, "%3C").replace(/>/g, "%3E")}>` : url;
  return `[📎 ${name}](${destination})`;
}
