import { createTranslator, getFormatLocale, i18nYaml } from "@/i18n";
const messages = i18nYaml<"src/lib/notebook-ai/messageTime.ts#messages:1">`
zh-Hans:
  yesterday: "昨天 {{time}}"
en:
  yesterday: "Yesterday {{time}}"
ja:
  yesterday: "昨日 {{time}}"
`;
const t = createTranslator(messages);

export const CHAT_TIME_GAP_MS = 5 * 60 * 1000;

type MessageWithCreatedAt = {
  metadata?: { createdAt?: number };
};

function startOfLocalDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

function formatHm(date: Date): string {
  return new Intl.DateTimeFormat(getFormatLocale(), {
    hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export function getMessageCreatedAt(
  message: MessageWithCreatedAt,
): number | undefined {
  const value = message.metadata?.createdAt;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function formatChatMessageTime(
  timestamp: number,
  now?: number | Date,
): string {
  if (!Number.isFinite(timestamp)) return "";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  const nowDate = now instanceof Date ? now : new Date(now ?? Date.now());
  if (Number.isNaN(nowDate.getTime())) return "";

  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = startOfLocalDay(nowDate);
  const msgDayStart = startOfLocalDay(date);
  const dayDiff = Math.round((todayStart - msgDayStart) / dayMs);
  const hm = formatHm(date);

  if (dayDiff === 0) return hm;
  if (dayDiff === 1) return t("yesterday", { time: hm });
  const options: Intl.DateTimeFormatOptions = dayDiff >= 2 && dayDiff < 7
    ? { weekday: "long" }
    : { month: "short", day: "numeric", ...(date.getFullYear() !== nowDate.getFullYear() ? { year: "numeric" as const } : {}) };
  return `${new Intl.DateTimeFormat(getFormatLocale(), options).format(date)} ${hm}`;
}

export function shouldShowChatTimeDivider(
  current: MessageWithCreatedAt,
  previous: MessageWithCreatedAt | null | undefined,
): boolean {
  const currentAt = getMessageCreatedAt(current);
  if (currentAt === undefined) return false;

  if (!previous) return true;
  const previousAt = getMessageCreatedAt(previous);
  if (previousAt === undefined) return true;

  return currentAt - previousAt >= CHAT_TIME_GAP_MS;
}

export function ensureNotebookAiMessageCreatedAt<T extends MessageWithCreatedAt>(
  messages: T[],
  now = Date.now(),
): T[] {
  let changed = false;
  const next = messages.map((message) => {
    if (getMessageCreatedAt(message) !== undefined) return message;
    changed = true;
    return {
      ...message,
      metadata: {
        ...message.metadata,
        createdAt: now,
      },
    } as T;
  });
  return changed ? next : messages;
}
