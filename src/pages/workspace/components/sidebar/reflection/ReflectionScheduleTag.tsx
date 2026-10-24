import { useEffect, useState } from "react";
import { createTranslator, i18nYaml, useLocale } from "@/i18n";
import { reflectionSchedule, type ReflectionScope } from "@/lib/reflection/scopeRange";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionScheduleTag.tsx#localMessages:1">`
zh-Hans:
  next: "下次生成 {{time}}"
  paused: "自动生成已暂停"
  schedule7d: "每周一 00:00，生成上周反思；关闭期间错过的任务会在下次启动时补生成。"
  schedule30d: "每月 1 日 00:00，生成上月反思；关闭期间错过的任务会在下次启动时补生成。"
  schedule90d: "每季度首日 00:00，生成上季度反思；关闭期间错过的任务会在下次启动时补生成。"
en:
  next: "Next: {{time}}"
  paused: "Auto-generation paused"
  schedule7d: "Mondays at 00:00 for the previous week. Missed runs catch up on next launch."
  schedule30d: "The 1st of each month at 00:00 for the previous month. Missed runs catch up on next launch."
  schedule90d: "The 1st of each quarter at 00:00 for the previous quarter. Missed runs catch up on next launch."
ja:
  next: "次回生成 {{time}}"
  paused: "自動生成は一時停止中"
  schedule7d: "毎週月曜 00:00 に前週の振り返りを生成。終了中に逃した分は次回起動時に生成します。"
  schedule30d: "毎月1日 00:00 に前月の振り返りを生成。終了中に逃した分は次回起動時に生成します。"
  schedule90d: "四半期初日 00:00 に前四半期の振り返りを生成。終了中に逃した分は次回起動時に生成します。"
`;
const uiText = createTranslator(localMessages);

export function ReflectionScheduleTag({ scope, enabled }: { scope: ReflectionScope; enabled: boolean }) {
  const locale = useLocale();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const nextAt = reflectionSchedule(scope, now).nextAt;
  const time = new Intl.DateTimeFormat(locale, {
    year: "numeric", month: "numeric", day: "numeric", weekday: "short",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(nextAt);
  return (
    <span
      className="inline-flex max-w-full items-center rounded-md bg-muted px-2 py-1 text-xs font-normal text-muted-foreground"
      title={uiText(`schedule${scope}` as "schedule7d")}
    >
      {enabled ? uiText("next", { time }) : uiText("paused")}
    </span>
  );
}
