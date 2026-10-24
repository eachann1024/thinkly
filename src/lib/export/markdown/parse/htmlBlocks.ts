import { parseAudioBlock } from "./audio";
import { parseColumnsBlock } from "./columnsBlock";
import { parseDetailsBlock } from "./detailsBlock";

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}


export function parseHtmlBlock(lines: string[], startIndex: number, parseMarkdown: (markdown: string) => any[]) {
  const structured = parseColumnsBlock(lines, startIndex, parseMarkdown) ?? parseAudioBlock(lines, startIndex);
  if (structured) return structured;
  const content: any[] = [];
  let i = startIndex;
  const line = lines[i];
  const trimmedLine = line.trim();
    const videoLineMatch = trimmedLine.match(
      /^<video\s+src="([^"]*)"[^>]*>\s*<\/video>$/i,
    );
    if (videoLineMatch) {
      content.push({
        type: "video",
        props: { url: decodeHtmlAttribute(videoLineMatch[1]) },
      });
      i++;
      return { block: content[0], nextIndex: i };
    }

    const details = parseDetailsBlock(lines, startIndex, parseMarkdown);
    if (details) return details;

  return null;
}
