export const NOTE_MARK = "thinkly";
export const NOTE_MARK_PATTERN = "(?:thinkly|goose-note)";

export function noteComment(body: string): string {
  return `<!-- ${NOTE_MARK}:${body} -->`;
}

export function noteCommentClose(body: string): string {
  return `<!-- /${NOTE_MARK}:${body} -->`;
}

export function dataAttr(name: string): string {
  return `data-${NOTE_MARK}-${name}`;
}

export function readDataAttr(element: Element, name: string): string | null {
  return element.getAttribute(dataAttr(name)) ?? element.getAttribute(`data-goose-${name}`);
}
