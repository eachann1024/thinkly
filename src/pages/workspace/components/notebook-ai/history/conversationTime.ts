import { i18nYaml, createTranslator, getFormatLocale } from "@/i18n";

const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/history/conversationTime.ts#messages:1">`
zh-Hans:
  today: "今天"
  yesterday: "昨天"
  daysAgo: "{{count}}天前"
en:
  today: "Today"
  yesterday: "Yesterday"
  daysAgo_one: "{{count}} day ago"
  daysAgo_other: "{{count}} days ago"
ja:
  today: "今日"
  yesterday: "昨日"
  daysAgo: "{{count}}日前"
`;
const t = createTranslator(messages);

export function formatConversationTime(timestamp: number, now = Date.now()) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date(now);
  // Compare local calendar dates via UTC so DST days still count as one day.
  const day = (value: Date) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  const days = (day(today) - day(date)) / 86_400_000;
  const datePart = days === 0 ? t("today")
    : days === 1 ? t("yesterday")
    : days > 1 && days < 7 ? t("daysAgo", { count: days })
    : date.toLocaleDateString(getFormatLocale(), { year: "numeric", month: "long", day: "numeric" });
  const time = date.toLocaleTimeString(getFormatLocale(), {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  return `${datePart} ${time}`;
}
