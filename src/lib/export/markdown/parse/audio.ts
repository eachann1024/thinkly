import { readDataAttr } from "../persistedNames";
import { sanitizeCssColor } from "../blockPropsProperties";

export function parseAudioBlock(lines: string[], start: number) {
  const line = lines[start].trim();
  if (!/^<(audio|video)\s+src="[^"]*"[^>]*>\s*<\/\1>$/i.test(line)) return null;
  const element = new DOMParser().parseFromString(line, "text/html").querySelector("audio, video");
  if (!element) return null;
  const type = element.tagName.toLowerCase();
  const width = Number(element.getAttribute("width"));
  const alignment = element.getAttribute("data-text-alignment");
  return {
    block: { type, props: {
      url: element.getAttribute("src") || "",
      name: readDataAttr(element, "name") || "",
      caption: readDataAttr(element, "caption") || "",
      showPreview: readDataAttr(element, "show-preview") !== "false",
      backgroundColor: sanitizeCssColor(element.getAttribute("data-background-color")) || "default",
      ...(type === "video" && Number.isFinite(width) && width > 0 ? { previewWidth: width } : {}),
      ...(type === "video" && alignment && ["left", "center", "right"].includes(alignment)
        ? { textAlignment: alignment } : {}),
    } },
    nextIndex: start + 1,
  };
}
