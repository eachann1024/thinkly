import { useLocale } from "@/i18n";
import { useEffect, useMemo, useState } from "react";
import { createTranslator, i18nYaml } from "@/i18n";
import { DialogShell } from "@/components/ui/dialog-shell";
import { FlatlineArt } from "@/components/ui/dot-matrix";
import { usePages } from "@/stores/usePages";
import { useTabs } from "@/stores/useTabs";
import { useSettings } from "@/stores/useSettings";
import { isReflectionAiConsented, useReflection } from "@/stores/useReflection";
import { activateNotebook } from "@/lib/notebookNavigation";
import { ensureReflection, isReflectionAIReady } from "@/lib/reflection/reflectionRunner";
import { DEFAULT_SCOPE, type ReflectionScope } from "@/lib/reflection/scopeRange";
import { previousWeek } from "@/lib/reflection/weekRange";
import { closeNotebookAiIfFullscreen } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";
import { ReflectionHeader } from "./ReflectionHeader";
import { ReflectionMetrics } from "./ReflectionMetrics";
import { ReflectionNarrative, type NarrativeState } from "./ReflectionNarrative";
import { ReflectionNoteList } from "./ReflectionNoteList";
import { ReflectionTopics } from "./ReflectionTopics";
import { ReflectionTrend } from "./ReflectionTrend";
import { useReflectionData } from "./useReflectionData";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionDialog.tsx#localMessages:1">`
zh-Hans:
  title: "反思"
  basis: "基于你的笔记编辑历史"
  empty: "这段时间没有编辑记录"
en:
  title: "Reflection"
  basis: "Based on your note edit history"
  empty: "No edits in this period"
ja:
  title: "振り返り"
  basis: "ノートの編集履歴に基づいています"
  empty: "この期間の編集履歴はありません"
`;
const uiText = createTranslator(localMessages);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReflectionDialog({ open, onOpenChange }: Props) {
  useLocale();
  const [scope, setScope] = useState<ReflectionScope>(DEFAULT_SCOPE);
  const ai = useSettings((s) => s.ai);
  const reports = useReflection((s) => s.reports);
  const aiConsent = useReflection((s) => isReflectionAiConsented(s, ai.enabled));
  const generatingKey = useReflection((s) => s.generatingKey);
  const failure = useReflection((s) => s.failure);
  const markSeen = useReflection((s) => s.markSeen);
  const setAiConsent = useReflection((s) => s.setAiConsent);
  const { data, loading, reload } = useReflectionData(open, scope);

  const aiReady = useMemo(() => isReflectionAIReady(), [ai]); // eslint-disable-line react-hooks/exhaustive-deps
  const key = data?.range.key ?? null;
  const report = key ? reports[key] : undefined;
  const hasEdits = (data?.stats.total ?? 0) > 0;
  const generating = key !== null && generatingKey === key;

  useEffect(() => {
    if (open) markSeen(previousWeek().key);
  }, [open, markSeen]);

  useEffect(() => {
    if (open && data && hasEdits && aiConsent && aiReady && !report) void ensureReflection(scope, { data });
  }, [open, data, hasEdits, aiConsent, aiReady, report, scope]);

  const refresh = async () => {
    const next = await reload(true);
    if (next) void ensureReflection(scope, { force: true, data: next });
  };

  const openNote = async (pageId: string) => {
    const page = usePages.getState().pages[pageId];
    if (!page) return;
    onOpenChange(false);
    closeNotebookAiIfFullscreen();
    await activateNotebook(page.workspaceId);
    useTabs.getState().openTab(pageId);
    await usePages.getState().setActivePage(pageId);
  };

  let state: NarrativeState = "ready";
  if (!aiReady) state = "notConfigured";
  else if (!aiConsent) state = "needsConsent";
  else if (generating) state = "generating";
  else if (failure?.key === key && !report) state = "failed";

  const pages = usePages.getState().pages;
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={uiText("title")}
      description={uiText("basis")}
      actions={(
        <ReflectionHeader
          scope={scope}
          busy={loading || generating}
          onScopeChange={setScope}
          onRefresh={() => void refresh()}
        />
      )}
      contentClassName="max-h-[calc(100dvh-64px)] w-[min(calc(100vw-32px),max(640px,68vw))] max-w-[1080px] sm:max-w-[1080px]"
      bodyClassName="space-y-10"
    >
      {data && !hasEdits ? (
        <div>
          <FlatlineArt className="mb-3.5 block max-w-full text-foreground" />
          <p className="text-sm text-muted-foreground">{uiText("empty")}</p>
        </div>
      ) : null}
      {data && hasEdits ? (
        <>
          <ReflectionNarrative
            state={state}
            report={report}
            onEnable={() => {
              setAiConsent(true);
              void ensureReflection(scope, { data });
            }}
          />
          <ReflectionMetrics stats={data.stats} />
          <ReflectionTrend points={data.stats.trend} />
          {report ? <ReflectionTopics topics={report.topics} /> : null}
          <ReflectionNoteList variant="top" notes={data.stats.perNote.slice(0, 5)} pages={pages} onOpen={(id) => void openNote(id)} />
          <ReflectionNoteList variant="stalled" notes={data.stats.stalled} pages={pages} onOpen={(id) => void openNote(id)} />
        </>
      ) : null}
    </DialogShell>
  );
}
