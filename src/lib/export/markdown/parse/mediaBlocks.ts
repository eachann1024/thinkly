import { isGeneratedDataImageName } from "@/components/editor/blocks/image/imageCaption";
import { sanitizeCssColor } from "../blockPropsProperties";

export function parseFileBlock(lines: string[], startIndex: number) {
  const match = lines[startIndex].trim().match(
    /^\[📎\s+((?:\\.|[^\]])*)\]\((?:<([^>]+)>|([^)]*))\)(?:\{goose-file=([^}]+)\})?$/,
  );
  if (!match) return null;
  const props: Record<string, unknown> = {
    name: match[1].replace(/\\([\\\]])/g, "$1").trim(),
    url: match[2] ?? match[3],
  };
  try {
    const metadata = JSON.parse(decodeURIComponent(match[4] || ""));
    if (metadata?.v === 1) {
      if (typeof metadata.name === "string") props.name = metadata.name;
      if (typeof metadata.caption === "string") props.caption = metadata.caption;
      const backgroundColor = sanitizeCssColor(metadata.backgroundColor);
      if (backgroundColor) props.backgroundColor = backgroundColor;
    }
  } catch {   }
  return { block: { type: "file", props }, nextIndex: startIndex + 1 };
}

export function parseImageBlock(lines: string[], startIndex: number) {
  const content: any[] = [];
  let i = startIndex;
  const line = lines[i];
  const trimmedLine = line.trim();
    const imgMatch = trimmedLine.match(
      /^!\[((?:\\.|[^\]])*)\]\((?:<([^>]+)>|([^)]*))\)(?:\{([^}]+)\})?$/,
    );
    if (imgMatch) {
      const metaRaw = imgMatch[4] || "";
      const metaMap = new Map<string, string>();
      metaRaw
        .split(/\s+/)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .forEach((chunk) => {
          const [key, value] = chunk.split("=");
          if (key && value) metaMap.set(key, value);
        });

      const width = metaMap.get("width");
      const widthValue = width ? Number(width) : undefined;
      const align = metaMap.get("align");
      const alt = imgMatch[1].replace(/\\([\\\]])/g, "$1");
      const url = imgMatch[2] ?? imgMatch[3];
      let imageMetadata: Record<string, unknown> | undefined;
      try {
        const parsed = JSON.parse(decodeURIComponent(metaMap.get("goose-image") || ""));
        if (parsed?.v === 1) imageMetadata = parsed;
      } catch {   }
      content.push({
        type: "image",
        props: {
          url,
          ...(alt ? { name: alt } : {}),
          ...(alt && !isGeneratedDataImageName(alt) ? { caption: alt } : {}),
          ...(imageMetadata ? {
            alt: typeof imageMetadata.alt === "string" ? imageMetadata.alt : alt,
            name: typeof imageMetadata.name === "string" ? imageMetadata.name : "",
            caption: typeof imageMetadata.caption === "string" ? imageMetadata.caption : "",
            captionSource: imageMetadata.captionSource === "generated" ? "generated" : imageMetadata.captionSource === "user" ? "user" : "",
            ...(sanitizeCssColor(imageMetadata.backgroundColor) ? { backgroundColor: sanitizeCssColor(imageMetadata.backgroundColor) } : {}),
            showPreview: imageMetadata.showPreview !== false,
          } : {}),
          ...(Number.isFinite(widthValue) && Number(widthValue) > 0 ? { previewWidth: widthValue } : {}),
          ...(align && ["center", "right"].includes(align) ? { textAlignment: align } : {}),
        },
      });
      i++;
      return { block: content[0], nextIndex: i };
    }

  return null;
}
