export function serializeFile(block: any): string {
  const props = block.props ?? block.attrs ?? {};
  const name = String(props.name || "文件").replace(/[\r\n]+/g, " ").replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
  const url = String(props.url || "");
  const destination = /[()\s<>]/.test(url) ? `<${url.replace(/</g, "%3C").replace(/>/g, "%3E")}>` : url;
  const metadata = encodeURIComponent(JSON.stringify({
    v: 1, name: props.name || "", caption: props.caption || "", backgroundColor: props.backgroundColor || "default",
  }));
  return `[📎 ${name}](${destination}){goose-file=${metadata}}`;
}
