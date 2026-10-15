import type { ReactNode } from "react";
import { openReleasePage } from "@/lib/electron/appUpdate";

function inlineText(text: string): ReactNode[] {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  const parts: ReactNode[] = [];
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > offset) parts.push(text.slice(offset, index));
    const token = match[0];
    const key = `${index}-${token}`;
    if (token.startsWith("`")) {
      parts.push(<code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.92em]">{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      parts.push(<strong key={key} className="font-medium">{token.slice(2, -2)}</strong>);
    } else {
      const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(token);
      if (link) {
        parts.push(<a key={key} href={link[2]} target="_blank" rel="noreferrer" className="underline underline-offset-4" onClick={(event) => {
          event.preventDefault();
          openReleasePage(link[2]);
        }}>{link[1]}</a>);
      }
    }
    offset = index + token.length;
  }
  if (offset < text.length) parts.push(text.slice(offset));
  return parts;
}

export function UpdateNotes({ markdown }: { markdown: string }) {
  if (!markdown.trim()) return null;
  const lines = markdown.replace(/\r/g, "").split("\n");
  const content: ReactNode[] = [];
  const isList = (line: string) => /^\s*(?:[-*+•]|\d+\.)\s+/.test(line);
  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line || /^\|.*\|$/.test(line)) { index += 1; continue; }
    const heading = /^#{1,6}\s+(.+)$/.exec(line);
    if (heading) {
      content.push(<h3 key={index} className="pt-1 text-base font-medium">{inlineText(heading[1])}</h3>);
      index += 1;
      continue;
    }
    if (isList(line)) {
      const start = index;
      const items: ReactNode[] = [];
      while (index < lines.length && isList(lines[index])) {
        items.push(<li key={index}>{inlineText(lines[index].replace(/^\s*(?:[-*+•]|\d+\.)\s+/, ""))}</li>);
        index += 1;
      }
      content.push(<ul key={start} className="list-disc space-y-2 pl-5">{items}</ul>);
      continue;
    }
    const start = index;
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^#{1,6}\s/.test(lines[index]) && !isList(lines[index])) {
      if (!/^\|.*\|$/.test(lines[index].trim())) paragraph.push(lines[index].trim());
      index += 1;
    }
    if (paragraph.length) content.push(<p key={start}>{inlineText(paragraph.join(" "))}</p>);
  }
  return <div className="space-y-4 break-words text-sm leading-7">{content}</div>;
}
