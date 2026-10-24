
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
  const lastLine =
    text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1) ?? "";
  const lastSentence =
    lastLine
      .split(/(?<=[。！？!?])/)
      .map((part) => part.trim())
      .filter(Boolean)
      .at(-1) ?? lastLine;
  return lastSentence;
}
