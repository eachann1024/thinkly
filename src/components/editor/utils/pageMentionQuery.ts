export const PAGE_MENTION_TRIGGERS = ["@"] as const;
export type PageMentionTrigger = (typeof PAGE_MENTION_TRIGGERS)[number];

export function isPageMentionBoundaryChar(charBefore: string): boolean {
  return !charBefore || !/[A-Za-z0-9._@+-]/.test(charBefore);
}

export function findActivePageMentionQuery(textBefore: string): {
  atIndex: number;
  trigger: PageMentionTrigger;
  query: string;
} | null {
  const trigger = PAGE_MENTION_TRIGGERS[0];
  const atIndex = textBefore.lastIndexOf(trigger);
  if (atIndex < 0 || !isPageMentionBoundaryChar(textBefore.charAt(atIndex - 1))) return null;
  const query = textBefore.slice(atIndex + trigger.length);
  if (/[\r\n\ufffc\u200b]/.test(query)) return null;
  return { atIndex, trigger, query };
}

export function mentionTriggerDeleteRange(
  blockStart: number, textBefore: string, caret: number,
): { from: number; to: number } | null {
  const active = findActivePageMentionQuery(textBefore);
  return active && blockStart + active.atIndex < caret
    ? { from: blockStart + active.atIndex, to: caret }
    : null;
}
