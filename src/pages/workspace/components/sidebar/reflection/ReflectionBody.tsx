import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";
import type { ReflectionData } from "@/lib/reflection/reflectionRunner";
import type { ReflectionRecordStatus } from "@/lib/reflection/reflectionRecord";
import type { ReflectionScope } from "@/lib/reflection/scopeRange";
import type { ReflectionReport } from "@/stores/useReflection";
import type { ReflectionPage } from "@/windows/data/reflectionSnapshot";
import { ReflectionMetrics } from "./ReflectionMetrics";
import { ReflectionNarrative, type NarrativeState } from "./ReflectionNarrative";
import { ReflectionNoteList } from "./ReflectionNoteList";
import { ReflectionRecordState } from "./ReflectionRecordState";
import { ReflectionTopics } from "./ReflectionTopics";
import { ReflectionTrendChart } from "./ReflectionTrendChart";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionBody.tsx#localMessages:1">`
zh-Hans:
  report: "本期反思"
  stats: "编辑统计"
  daily: "每日编辑"
  weekly: "每周编辑"
en:
  report: "This reflection"
  stats: "Edit stats"
  daily: "Daily edits"
  weekly: "Weekly edits"
ja:
  report: "この期の振り返り"
  stats: "編集の統計"
  daily: "毎日の編集"
  weekly: "毎週の編集"
`;
const uiText = createTranslator(localMessages);

interface Props {
  scope: ReflectionScope;
  data: ReflectionData | null;
  recordStatus: ReflectionRecordStatus;
  rangeLabel: string;
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
  scope, data, recordStatus, rangeLabel, pages, state, report, failureMessage,
  onEnable, onOpenSettings, onRetry, onScopeChange, onOpenNote,
}: Props) {
  useLocale();
  if (!data || recordStatus !== "ready") {
    return (
      <ReflectionRecordState
        status={recordStatus === "ready" ? "loading" : recordStatus}
        scope={scope}
        rangeLabel={rangeLabel}
        onScopeChange={onScopeChange}
        onReload={onRetry}
      />
    );
  }
  if (data.stats.total === 0) {
    return (
      <ReflectionRecordState
        status="empty"
        scope={scope}
        rangeLabel={rangeLabel}
        onScopeChange={onScopeChange}
        onReload={onRetry}
      />
    );
  }
  const showTopics = state === "ready" && Boolean(report?.topics.length);
  return (
    <div className="mx-auto box-border grid w-full max-w-[1120px] grid-cols-1 gap-10 px-8 py-7 min-[860px]:grid-cols-[minmax(0,1fr)_340px]">
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
