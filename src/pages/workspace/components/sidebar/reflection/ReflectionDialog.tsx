import { useEffect, useMemo } from "react";
import { createTranslator, i18nYaml } from "@/i18n";
import { getFormatLocale } from "@/i18n/runtime";
import { DialogShell } from "@/components/ui/dialog-shell";
import { usePages } from "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";
import { useReflection } from "@/stores/useReflection";
import {
  ensureLastWeekReflection,
  getLastWeekSnapshot,
  isReflectionAIReady,
} from "@/lib/reflection/reflectionRunner";
import { EMPTY_ACTIVITY } from "@/lib/reflection/activityLog";
import { addDays, previousWeek, trailingWeeks } from "@/lib/reflection/weekRange";
import { computeWeekStats } from "@/lib/reflection/weekStats";
import { ReflectionChart } from "./ReflectionChart";
import { ReflectionNarrative, type NarrativeState } from "./ReflectionNarrative";
import { ReflectionStats } from "./ReflectionStats";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionDialog.tsx#localMessages:1">`
zh-Hans:
  title: "每周反思"
en:
  title: "Weekly reflection"
`;
const uiText = createTranslator(localMessages);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReflectionDialog({ open, onOpenChange }: Props) {
  const ai = useSettings((s) => s.ai);
  const activity = useReflection((s) => s.activity);
  const reports = useReflection((s) => s.reports);
  const aiConsent = useReflection((s) => s.aiConsent);
  const generatingKey = useReflection((s) => s.generatingKey);
  const failure = useReflection((s) => s.failure);
  const markSeen = useReflection((s) => s.markSeen);
  const setAiConsent = useReflection((s) => s.setAiConsent);

  // 仅在打开（或 activity 变化）时计算；pages 只在计算时取一次快照，不订阅。
  const { week, stats, eligible, trend } = useMemo(() => {
    if (!open) {
      const stats = computeWeekStats(EMPTY_ACTIVITY, {}, previousWeek());
      return { week: previousWeek(), stats, eligible: false, trend: [] as number[][] };
    }
    const snapshot = getLastWeekSnapshot();
    const pages = usePages.getState().pages;
    const trend = trailingWeeks(snapshot.week.start, 4).map(
      (w) => computeWeekStats(activity, pages, w).daily,
    );
    return { ...snapshot, trend };
  }, [open, activity]);

  const aiReady = useMemo(() => isReflectionAIReady(), [ai]); // eslint-disable-line react-hooks/exhaustive-deps
  const report = reports[week.key];
  const generating = generatingKey === week.key;

  useEffect(() => {
    if (!open) return;
    if (report) markSeen(week.key);
    if (eligible && aiConsent && aiReady && !report) void ensureLastWeekReflection();
  }, [open, week.key, eligible, aiConsent, aiReady, report, markSeen]);

  let state: NarrativeState = "ready";
  if (!eligible) state = "tooFew";
  else if (!aiReady) state = "notConfigured";
  else if (!aiConsent) state = "needsConsent";
  else if (generating) state = "generating";
  else if (failure?.weekKey === week.key && !report) state = "failed";

  const range = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(getFormatLocale(), { month: "short", day: "numeric" });
    return `${fmt.format(week.start)} – ${fmt.format(addDays(week.start, 6))}`;
  }, [week.start]);

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={`${uiText("title")} · ${range}`}
      contentClassName="sm:max-w-xl"
      bodyClassName="space-y-4 p-6 pt-2"
    >
      <ReflectionNarrative
        state={state}
        report={report}
        onEnable={() => {
          setAiConsent(true);
          void ensureLastWeekReflection();
        }}
        onRefresh={() => void ensureLastWeekReflection(true)}
      />
      {stats.total > 0 ? <ReflectionStats stats={stats} weekStart={week.start} /> : null}
      <ReflectionChart weeks={trend} />
    </DialogShell>
  );
}
