import { useEffect, useId, useMemo, useState } from "react";
import { ChevronRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import type { NotebookAiExecution } from "@/lib/notebook-ai/types";
import { ExecutionDisclosure } from "./ExecutionDisclosure";
import { ToolProgressSteps } from "./ToolProgressSteps";
import type { ProgressStep, ToolProgressPart } from "./toolProgressModel";
import { prepareExecutionSegments, formatExecutionTime } from "./executionPresentation";
import { ExecutionOverview } from "./ExecutionOverview";
import { ExecutionSources, useExecutionSources } from "./ExecutionSources";
import { useOutputSpeed } from "./useOutputSpeed";
import { useLocale, i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ExecutionTrace.tsx#messages:1">`
zh-Hans:
  execution: "执行过程"
  model: "本次模型"
en:
  execution: "Execution"
  model: "Model"
ja:
  execution: "実行過程"
  model: "今回のモデル"
`;
const t = createTranslator(messages);

export function ExecutionTrace({ parts, steps, execution, running, label, thinkingLine, outputChars = 0, answerText, statusLabel }: {
  parts: ToolProgressPart[]; steps: ProgressStep[]; execution?: NotebookAiExecution; running: boolean; outputChars?: number;
  label: string; thinkingLine: string; answerText?: string; statusLabel: (status: ProgressStep["status"]) => string;
}) {
  const locale = useLocale();
  // Follow the run (open while working, folded when done) until the user toggles it by hand.
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open = manualOpen ?? running;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!running || !execution || execution.endedAt) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running, execution?.startedAt, execution?.endedAt]);
  const measuredEnd = execution?.endedAt ?? (running ? now : execution?.startedAt ?? now);
  const duration = execution && (running || execution.endedAt !== undefined)
    ? Math.max(0, measuredEnd - execution.startedAt) : undefined;
  const speed = useOutputSpeed(outputChars, now, running && !!execution && !execution.endedAt);
  const timeline = useMemo(() => open && execution ? prepareExecutionSegments(execution, parts) : null, [open, execution, parts]);
  const segments = timeline?.(measuredEnd) ?? [];
  const sources = useExecutionSources(parts, execution, answerText);
  const step = [...steps].reverse().find(item => item.status === "running")?.label;
  const id = useId();
  return <div className="notebook-ai-work-trace notebook-ai-work-trace--foldable">
    <Button variant="ghost" size={null} contentStyle="preserve" className="notebook-ai-work-toggle"
      aria-expanded={open} aria-controls={id} onClick={() => setManualOpen(!open)}>
      <ChevronRight className="notebook-ai-work-chev" size={16} />
      <span className="notebook-ai-work-toggle-label">{execution ? t("execution") : label}</span>
      {duration !== undefined ? <time className="notebook-ai-execution-duration">{formatExecutionTime(duration, locale)}</time> : null}
      {running && thinkingLine ? <span className="notebook-ai-work-think" title={thinkingLine}>{thinkingLine}</span> : null}
    </Button>
    <ExecutionDisclosure open={open} id={id}>
      {execution && segments.length ? <ExecutionOverview segments={segments} now={measuredEnd} running={running && !execution.endedAt}
        model={execution.modelId} thinking={thinkingLine} step={step} speed={speed} /> : null}
      <ToolProgressSteps steps={steps} execution={execution} statusLabel={statusLabel} />
      <ExecutionSources sources={sources} />
      {execution?.modelId ? <p className="notebook-ai-execution-model"><span>{t("model")}</span><span title={execution.modelId}>{execution.modelId}</span></p> : null}
    </ExecutionDisclosure>
  </div>;
}
