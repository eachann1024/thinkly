import { formatConversationTime } from "@/pages/workspace/components/notebook-ai/history/conversationTime";
import { getLanguageSnapshot, setLanguageSnapshot } from "@/i18n";
import { createChecker } from "./lib/check";

export default async function run(): Promise<number> {
  const checker = createChecker();
  const previousLanguage = getLanguageSnapshot();
  const previousTimezone = process.env.TZ;
  const locale = (effectiveLocale: "zh-Hans" | "en" | "ja", formatLocale: string) => {
    setLanguageSnapshot({ preference: effectiveLocale, effectiveLocale, formatLocale, revision: getLanguageSnapshot().revision + 1 });
  };
  try {
    process.env.TZ = "Asia/Singapore";
    locale("zh-Hans", "zh-CN");
    const now = new Date(2026, 9, 24, 12).getTime();
    const at = (day: number) => new Date(2026, 9, day, 19, 31, 39).getTime();
    checker.check("当天与昨天保留日期含义和完整时间", formatConversationTime(at(24), now) === "今天 19:31:39" && formatConversationTime(at(23), now) === "昨天 19:31:39");
    checker.check("一周内用相对天数和时间", formatConversationTime(at(21), now) === "3天前 19:31:39" && formatConversationTime(at(18), now) === "6天前 19:31:39");
    checker.check("七天边界恢复完整年月日", formatConversationTime(at(17), now) === "2026年10月17日 19:31:39");
    checker.check("同年旧记录保留年份", formatConversationTime(at(12), now) === "2026年10月12日 19:31:39");
    checker.check("跨年保留原始年月日", formatConversationTime(new Date(2025, 11, 31, 9, 42, 18).getTime(), now) === "2025年12月31日 09:42:18");
    checker.check("未来日期不用负数天前", formatConversationTime(at(25), now) === "2026年10月25日 19:31:39");
    checker.check("无效时间不显示 Invalid Date", formatConversationTime(NaN, now) === "");
    locale("en", "en-US");
    checker.check("英文日期和相对天数", formatConversationTime(at(21), now) === "3 days ago 19:31:39" && formatConversationTime(at(12), now).includes("2026"));
    locale("ja", "ja-JP");
    checker.check("日文日期和相对天数", formatConversationTime(at(21), now) === "3日前 19:31:39" && formatConversationTime(at(12), now).includes("2026"));
    locale("zh-Hans", "zh-CN");
    process.env.TZ = "America/New_York";
    const spring = new Date(2026, 2, 9, 12).getTime();
    const autumn = new Date(2026, 10, 2, 12).getTime();
    checker.check("夏令时切换仍按本地日历计算", formatConversationTime(new Date(2026, 2, 7, 19, 31, 39).getTime(), spring) === "2天前 19:31:39" && formatConversationTime(new Date(2026, 9, 31, 19, 31, 39).getTime(), autumn) === "2天前 19:31:39");
  } finally {
    setLanguageSnapshot({ ...previousLanguage, revision: getLanguageSnapshot().revision + 1 });
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
  return checker.failed;
}
