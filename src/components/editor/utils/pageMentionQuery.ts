export const PAGE_MENTION_TRIGGERS = ["@", "[[", "+"] as const;
export type PageMentionTrigger = (typeof PAGE_MENTION_TRIGGERS)[number];

/** 排除邮箱/标识符内部；中文、空白和标点可作为页面引用边界。 */
export function isPageMentionBoundaryChar(charBefore: string): boolean {
  return !charBefore || !/[A-Za-z0-9._@+-]/.test(charBefore);
}

export function findActivePageMentionQuery(textBefore: string): {
  atIndex: number;
  trigger: PageMentionTrigger;
  query: string;
} | null {
  const candidates = PAGE_MENTION_TRIGGERS.map((trigger) => ({
    trigger, atIndex: textBefore.lastIndexOf(trigger),
  })).sort((a, b) => b.atIndex - a.atIndex);
  for (const { trigger, atIndex } of candidates) {
    if (atIndex < 0 || (trigger !== "[[" && !isPageMentionBoundaryChar(textBefore.charAt(atIndex - 1)))) continue;
    const query = textBefore.slice(atIndex + trigger.length);
    if (/[\r\n\ufffc\u200b]/.test(query) || query.includes("]]")) continue;
    if (trigger === "[[" && /[\[\]]/.test(query)) continue;
    return { atIndex, trigger, query };
  }
  return null;
}

export function mentionTriggerDeleteRange(
  blockStart: number, textBefore: string, caret: number,
): { from: number; to: number } | null {
  const active = findActivePageMentionQuery(textBefore);
  return active && blockStart + active.atIndex < caret
    ? { from: blockStart + active.atIndex, to: caret }
    : null;
}
