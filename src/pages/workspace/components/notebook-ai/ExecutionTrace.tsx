import { useEffect, useId, useMemo, useState } from "react";
import { ChevronRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import type { NotebookAiExecution } from "@/lib/notebook-ai/types";
import { ExecutionDisclosure } from "./ExecutionDisclosure";
import { ToolProgressSteps } from "./ToolProgressSteps";
import type { ProgressStep, ToolProgressPart } from "./toolProgressModel";
import { prepareExecutionStages, formatExecutionTime } from "./executionPresentation";
import { useLocale, i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ExecutionTrace.tsx#messages:1">`
zh-Hans:
  execution: "执行过程"
  model: "本次模型"
  read: "读取"
  write: "工具处理"
  visual: "可视化"
  response: "响应"
en:
  execution: "Execution"
  model: "Model"
  read: "Reading"
  write: "Tools"
  visual: "Visualization"
  response: "Response"
ja:
  execution: "実行過程"
  model: "今回のモデル"
  read: "読み取り"
  write: "ツール処理"
  visual: "可視化"
  response: "応答"
`;
const t = createTranslator(messages);

export function ExecutionTrace({ parts, steps, execution, running, label, thinkingLine, statusLabel }: {
  parts: ToolProgressPart[]; steps: ProgressStep[]; execution?: NotebookAiExecution; running: boolean;
  label: string; thinkingLine: string; statusLabel: (status: ProgressStep["status"]) => string;
}) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!running || !execution || execution.endedAt) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running, execution?.startedAt, execution?.endedAt]);
  const measuredEnd = execution?.endedAt ?? (running ? now : execution?.startedAt ?? now);
  const duration = execution ? Math.max(0, measuredEnd - execution.startedAt) : undefined;
  const timeline = useMemo(() => open && execution ? prepareExecutionStages(execution, parts) : null, [open, execution, parts]);
  const stages = timeline?.(measuredEnd) ?? [];
  const id = useId();
  return <div className="notebook-ai-work-trace notebook-ai-work-trace--foldable">
    <Button variant="ghost" size={null} contentStyle="preserve" className="notebook-ai-work-toggle"
      aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <ChevronRight className="notebook-ai-work-chev" size={16} />
      <span className="notebook-ai-work-toggle-label">{execution ? t("execution") : label}</span>
      {duration !== undefined ? <time className="notebook-ai-execution-duration">{formatExecutionTime(duration, locale)}</time> : null}
      {running && thinkingLine ? <span className="notebook-ai-work-think" title={thinkingLine}>{thinkingLine}</span> : null}
    </Button>
    <ExecutionDisclosure open={open} id={id}>
      {stages.length ? <div className="notebook-ai-execution-stages">
        <div className="notebook-ai-execution-bar" aria-hidden>{stages.map(([stage, value]) => <span key={stage} data-stage={stage} style={{ flex: value }} />)}</div>
        <div className="notebook-ai-execution-legend">{stages.map(([stage, value]) => <span key={stage} data-stage={stage}>{t(stage)} {formatExecutionTime(value, locale)}</span>)}</div>
      </div> : null}
      {execution?.modelId ? <p className="notebook-ai-execution-model"><span>{t("model")}</span><span title={execution.modelId}>{execution.modelId}</span></p> : null}
      <ToolProgressSteps steps={steps} execution={execution} statusLabel={statusLabel} />
    </ExecutionDisclosure>
  </div>;
}
