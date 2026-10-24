import { useEffect, useState } from "react";
import { createTranslator, i18nYaml, useLocale } from "@/i18n";
import { reflectionSchedule, type ScopeRange } from "@/lib/reflection/scopeRange";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionScheduleTag.tsx#localMessages:1">`
zh-Hans:
  next: "下次生成 {{time}}"
  paused: "自动生成已暂停"
  schedule7d: "每周一 00:00，生成最近 7 天的反思；关闭期间错过的任务会在下次启动时补生成。"
  schedule30d: "每月 1 日 00:00，生成最近 30 天的反思；关闭期间错过的任务会在下次启动时补生成。"
  schedule90d: "每季度首日 00:00，生成最近 90 天的反思；关闭期间错过的任务会在下次启动时补生成。"
en:
  next: "Next: {{time}}"
  paused: "Auto-generation paused"
  schedule7d: "Mondays at 00:00 for the last 7 days. Missed runs catch up on next launch."
  schedule30d: "The 1st of each month at 00:00 for the last 30 days. Missed runs catch up on next launch."
  schedule90d: "The 1st of each quarter at 00:00 for the last 90 days. Missed runs catch up on next launch."
ja:
  next: "次回生成 {{time}}"
  paused: "自動生成は一時停止中"
  schedule7d: "毎週月曜 00:00 に直近7日間の振り返りを生成。終了中に逃した分は次回起動時に生成します。"
  schedule30d: "毎月1日 00:00 に直近30日間の振り返りを生成。終了中に逃した分は次回起動時に生成します。"
  schedule90d: "四半期初日 00:00 に直近90日間の振り返りを生成。終了中に逃した分は次回起動時に生成します。"
`;
const uiText = createTranslator(localMessages);

export function ReflectionScheduleTag({ range, enabled }: { range: ScopeRange; enabled: boolean }) {
  const locale = useLocale();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const nextAt = reflectionSchedule(range.scope, now).nextAt;
  const time = new Intl.DateTimeFormat(locale, {
    year: "numeric", month: "numeric", day: "numeric", weekday: "short",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(nextAt);
  const date = new Intl.DateTimeFormat(locale, { year: "numeric", month: "numeric", day: "numeric" });
  return (
    <span
      className="inline-flex max-w-full items-center rounded-md bg-muted px-2 py-1 text-xs font-normal text-muted-foreground"
      title={`${enabled ? uiText("next", { time }) : uiText("paused")} · ${uiText(`schedule${range.scope}` as "schedule7d")}`}
    >
      {date.format(range.start)} – {date.format(range.end - 1)}
    </span>
  );
}
