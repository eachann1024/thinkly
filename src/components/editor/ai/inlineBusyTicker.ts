
export type InlineBusyTickerSource = {
  reasoningText?: string;
  text?: string;
};

export function resolveInlineBusyTicker(
  update: InlineBusyTickerSource,
): string {
  const reasoning = update.reasoningText ?? "";
  if (reasoning.trim()) return reasoning;
  return update.text ?? "";
}

export function composeInlineBusyTicker(
  update: InlineBusyTickerSource,
): string {
  return visibleBusyTickerLine(resolveInlineBusyTicker(update));
}

export function visibleBusyTickerLine(text: string): string {
  let end = text.length;
  while (end > 0 && isTrimWhitespace(text.charCodeAt(end - 1))) end -= 1;
  if (end === 0) return "";

  // A punctuation belongs to the segment before it, including a trailing one.
  // Search only the visible suffix instead of splitting the accumulated stream.
  let start = end - 2;
  while (start >= 0) {
    const code = text.charCodeAt(start);
    if (code === 10 || isSentencePunctuation(code)) break;
    start -= 1;
  }
  return text.slice(start + 1, end).trim();
}

function isSentencePunctuation(code: number) {
  return code === 0x3002 || code === 0xff01 || code === 0xff1f || code === 0x21 || code === 0x3f;
}

function isTrimWhitespace(code: number) {
  return code === 0x0009 || code === 0x000a || code === 0x000b || code === 0x000c ||
    code === 0x000d || code === 0x0020 || code === 0x00a0 || code === 0x1680 ||
    (code >= 0x2000 && code <= 0x200a) || code === 0x2028 || code === 0x2029 ||
    code === 0x202f || code === 0x205f || code === 0x3000 || code === 0xfeff;
}
