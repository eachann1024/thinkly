import { createTranslator, i18nYaml } from "@/i18n";
import { getFormatLocale } from "@/i18n/runtime";
import { addDays } from "@/lib/reflection/weekRange";
import type { WeekStats } from "@/lib/reflection/weekStats";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionStats.tsx#localMessages:1">`
zh-Hans:
  busiestDay: "最活跃的一天"
  peakHour: "高峰时段"
  notesEdited: "编辑的笔记"
  notesUnit: "{{count}} 篇"
en:
  busiestDay: "Busiest day"
  peakHour: "Peak hours"
  notesEdited: "Notes edited"
  notesUnit: "{{count}}"
`;
const uiText = createTranslator(localMessages);

const pad = (n: number) => String(n).padStart(2, "0");

export function ReflectionStats({ stats, weekStart }: { stats: WeekStats; weekStart: number }) {
  const weekday =
    stats.busiestDay === null
      ? "–"
      : new Intl.DateTimeFormat(getFormatLocale(), { weekday: "long" }).format(
          addDays(weekStart, stats.busiestDay),
        );
  const hour =
    stats.peakHour === null ? "–" : `${pad(stats.peakHour)}:00–${pad((stats.peakHour + 1) % 24)}:00`;
  const items = [
    [uiText("busiestDay"), weekday],
    [uiText("peakHour"), hour],
    [uiText("notesEdited"), uiText("notesUnit", { count: stats.notes })],
  ];
  return (
    <dl className="grid grid-cols-3 gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-lg bg-[hsl(var(--goose-raised-bg))] px-3 py-2">
          <dt className="truncate text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
