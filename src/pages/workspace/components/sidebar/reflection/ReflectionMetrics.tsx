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
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dd className="truncate text-2xl font-semibold tabular-nums text-foreground">{value}</dd>
          <dt className="mt-1 truncate text-xs text-muted-foreground">{label}</dt>
        </div>
      ))}
    </dl>
  );
}
