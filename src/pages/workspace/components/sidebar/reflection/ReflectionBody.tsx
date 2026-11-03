import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";
import { SelectedStateArt, SelectedStateBackdrop } from "@/components/ui/dot-matrix";
import { Button } from "@/components/ui/button";
import type { ReflectionData } from "@/lib/reflection/reflectionRunner";
import { DEFAULT_SCOPE, type ReflectionScope } from "@/lib/reflection/scopeRange";
import type { ReflectionReport } from "@/stores/useReflection";
import type { ReflectionPage } from "@/windows/data/reflectionSnapshot";
import { ReflectionMetrics } from "./ReflectionMetrics";
import { ReflectionNarrative, type NarrativeState } from "./ReflectionNarrative";
import { ReflectionNoteList } from "./ReflectionNoteList";
import { ReflectionTopics } from "./ReflectionTopics";
import { ReflectionTrendChart } from "./ReflectionTrendChart";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionBody.tsx#localMessages:1">`
zh-Hans:
  empty: "这段时间没有编辑记录"
  emptyHint: "反思基于笔记的编辑历史。换一个更长的时间范围看看，或者写点东西再回来。"
  lookFurther: "看最近 30 天"
  report: "本期反思"
  stats: "编辑统计"
  daily: "每日编辑"
  weekly: "每周编辑"
en:
  empty: "No edits in this period"
  emptyHint: "Reflection is based on your note edit history. Try a longer range, or write something and come back."
  lookFurther: "See the last 30 days"
  report: "This reflection"
  stats: "Edit stats"
  daily: "Daily edits"
  weekly: "Weekly edits"
ja:
  empty: "この期間の編集履歴はありません"
  emptyHint: "振り返りはノートの編集履歴に基づきます。より長い期間を見るか、書いてから戻ってきてください。"
  lookFurther: "直近30日間を見る"
  report: "この期の振り返り"
  stats: "編集の統計"
  daily: "毎日の編集"
  weekly: "毎週の編集"
`;
const uiText = createTranslator(localMessages);

interface Props {
  scope: ReflectionScope;
  data: ReflectionData | null;
  pages: Record<string, ReflectionPage>;
  state: NarrativeState;
  report?: ReflectionReport;
  failureMessage?: string;
  onEnable: () => void;
  onOpenSettings: () => void;
  onRetry: () => void;
  onScopeChange: (scope: ReflectionScope) => void;
  onOpenNote: (pageId: string) => void;
}

export function ReflectionBody({
  scope, data, pages, state, report, failureMessage,
  onEnable, onOpenSettings, onRetry, onScopeChange, onOpenNote,
}: Props) {
  useLocale();
  if (!data) return null;
  if (data.stats.total === 0) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-2.5 px-6 py-12 text-center">
        <div className="relative w-[300px] max-w-full">
          <SelectedStateBackdrop kind="reflection" compact />
          <SelectedStateArt kind="reflection" className="relative block h-auto max-w-full" />
        </div>
        <span className="text-[15px] font-medium text-foreground">{uiText("empty")}</span>
        <span className="max-w-[360px] text-sm leading-5 text-muted-foreground">{uiText("emptyHint")}</span>
        {scope === DEFAULT_SCOPE ? (
          <Button type="button" variant="outline" size="sm" className="mt-1.5" onClick={() => onScopeChange("30d")}>
            {uiText("lookFurther")}
          </Button>
        ) : null}
      </div>
    );
  }
  const showTopics = state === "ready" && Boolean(report?.topics.length);
  return (
    <div className="mx-auto box-border grid max-w-[1120px] grid-cols-1 gap-10 px-8 py-7 min-[860px]:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-8">
        <section aria-label={uiText("report")} className="flex flex-col gap-3.5">
          <ReflectionNarrative
            state={state}
            report={state === "generating" ? undefined : report}
            failureMessage={failureMessage}
            onEnable={onEnable}
            onOpenSettings={onOpenSettings}
            onRetry={onRetry}
          />
        </section>
        {showTopics && report ? <ReflectionTopics topics={report.topics} /> : null}
      </div>
      <aside aria-label={uiText("stats")} className="flex min-w-0 flex-col gap-7">
        <ReflectionMetrics stats={data.stats} />
        <ReflectionTrendChart points={data.stats.trend} label={scope === "90d" ? uiText("weekly") : uiText("daily")} />
        <ReflectionNoteList variant="top" notes={data.stats.perNote.slice(0, 5)} pages={pages} onOpen={onOpenNote} />
        <ReflectionNoteList variant="stalled" notes={data.stats.stalled} pages={pages} onOpen={onOpenNote} />
      </aside>
    </div>
  );
}
