import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";
import { getFormatLocale } from "@/i18n/runtime";
import type { ReflectionStats } from "@/lib/reflection/reflectionStats";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionMetrics.tsx#localMessages:1">`
zh-Hans:
  busiestDay: "最活跃的一天"
  peakHour: "高峰时段"
  notesEdited: "编辑过的笔记"
  charsAdded: "新增字数"
en:
  busiestDay: "Busiest day"
  peakHour: "Peak hours"
  notesEdited: "Notes edited"
  charsAdded: "Characters added"
ja:
  busiestDay: "最も活発だった日"
  peakHour: "ピーク時間帯"
  notesEdited: "編集したノート"
  charsAdded: "追加した文字数"
`;
const uiText = createTranslator(localMessages);

const pad = (n: number) => String(n).padStart(2, "0");

export function ReflectionMetrics({ stats }: { stats: ReflectionStats }) {
  useLocale();
  const locale = getFormatLocale();
  const day =
    stats.busiestDay === null
      ? "–"
      : new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(stats.busiestDay);
  const hour =
    stats.peakHour === null ? "–" : `${pad(stats.peakHour)}:00–${pad((stats.peakHour + 1) % 24)}:00`;
  const items = [
    [uiText("busiestDay"), day],
    [uiText("peakHour"), hour],
    [uiText("notesEdited"), new Intl.NumberFormat(locale).format(stats.notes)],
    [uiText("charsAdded"), new Intl.NumberFormat(locale).format(stats.added)],
  ];
  return (
    <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-[18px]">
      {items.map(([label, value]) => (
        <div key={label} className="flex min-w-0 flex-col-reverse">
          <dt className="mt-0.5 truncate text-xs text-muted-foreground">{label}</dt>
          <dd className="m-0 truncate whitespace-nowrap text-[22px] font-semibold tabular-nums text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
