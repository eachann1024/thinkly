import { useLocale } from "@/i18n";
import type { NotebookAiCompletion, NotebookAiExecution } from "@/lib/notebook-ai/types";
import { useMemo, useState, type ReactNode } from "react";
import { ExecutionTrace } from "./ExecutionTrace";
import { ExecutionSources } from "./ExecutionSources";
import { PlanReviewProvider } from "./approval/PlanReviewContext";
import { visibleBusyTickerLine } from "@/components/editor/ai/inlineBusyTicker";

import { cn } from "@/lib/utils";
import {
  buildToolProgressSteps,
  getToolProgressStepStatus,
  getToolProgressSummary,
  type ProgressStep,
  type ToolProgressPart,
} from "./toolProgressModel";
import { getToolProgressFacts } from "./toolProgressFacts";
import { getWorkCardHeading, getWorkCardPhase } from "./workCardHeading";
import { WorkCardStatus } from "./WorkCardStatus";
import {
  WorkCardStatusContext,
  type WorkCardStatusData,
} from "./workCardStatusContext";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ToolProgressCard.tsx#messages:1">`
zh-Hans:
  inProgress: "进行中"
  failed: "失败"
  complete: "完成"
  awaitingApproval: "等待审批"
  canceled: "已取消"
  undone: "已撤回"
  pending: "待处理"
  thinking: "思考"
  progress: "处理进度"
en:
  inProgress: "In progress"
  failed: "Failed"
  complete: "Complete"
  awaitingApproval: "Awaiting approval"
  canceled: "Canceled"
  undone: "Undone"
  pending: "Pending"
  thinking: "Thinking"
  progress: "Progress"
ja:
  inProgress: "進行中"
  failed: "失敗"
  complete: "完了"
  awaitingApproval: "承認待ち"
  canceled: "キャンセル済み"
  undone: "取り消し済み"
  pending: "保留中"
  thinking: "思考"
  progress: "処理状況"
`;
const t = createTranslator(messages);


export {
  getToolProgressStepStatus,
  getToolProgressSummary,
  type ToolProgressPart,
};

function stepStatusLabel(status: ProgressStep["status"]) {
  if (status === "running") return t("inProgress");
  if (status === "error") return t("failed");
  if (status === "done") return t("complete");
  if (status === "approval") return t("awaitingApproval");
  if (status === "cancelled") return t("canceled");
  if (status === "undone") return t("undone");
  return t("pending");
}

interface ToolProgressCardProps {
  parts: ToolProgressPart[];
  execution?: NotebookAiExecution;
  isMessageStreaming?: boolean;
  completion?: NotebookAiCompletion;
  thinkingText?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

export function ToolProgressCard({
  parts,
  execution,
  isMessageStreaming,
  completion,
  thinkingText,
  children,
  footer,
}: ToolProgressCardProps) {
  const locale = useLocale();
  const steps = useMemo(
    () => buildToolProgressSteps(parts, isMessageStreaming, completion),
    [parts, isMessageStreaming, completion, locale],
  );
  const thinkingLine = useMemo(() => visibleBusyTickerLine(thinkingText ?? ""), [thinkingText]);
  const hasThinking = thinkingLine.length > 0;

  const activity = useMemo(() => getToolProgressFacts(steps), [steps]);
  const hasError = Boolean(activity.firstError);
  const isRunning =
    !hasError &&
    !completion &&
    (Boolean(isMessageStreaming) ||
      activity.hasRunning);
  const showRunning = isRunning;
  const phase = useMemo(() => getWorkCardPhase(steps, showRunning, completion), [steps, showRunning, completion]);
  const heading = useMemo(() => getWorkCardHeading(steps, phase), [steps, phase, locale]);
  const [approvalStatus, setApprovalStatus] =
    useState<WorkCardStatusData | null>(null);
  const interrupted = Boolean(completion && completion !== "complete");
  const status = interrupted ? heading.status : approvalStatus ?? heading.status;
  const showProcessing = status.icon === "running";
  const foldable = steps.length > 0;
  const traceLabel = foldable ? heading.toggle : hasThinking ? t("thinking") : "";
  const showTraceRow = foldable || hasThinking || Boolean(execution);
  const hasHeading = foldable || showRunning || interrupted;

  if (!hasHeading && !showTraceRow && !children && !footer) return null;

  return (
    <PlanReviewProvider>
      <WorkCardStatusContext.Provider value={setApprovalStatus}>
        <section
          className={cn(
            "bui-root bui-approval notebook-ai-work-card",
            showProcessing && "notebook-ai-work-card--running",
          )}
          aria-label={t("progress")}
          aria-busy={showProcessing || undefined}
        >
          {hasHeading ? <WorkCardStatus status={status} /> : null}
          {heading.detail && !footer ? (
            <p className="notebook-ai-work-status-detail" role="alert">
              {heading.detail}
            </p>
          ) : null}
          {showTraceRow ? (
            <ExecutionTrace parts={parts} steps={steps} execution={execution}
              running={isRunning} label={traceLabel} thinkingLine={thinkingLine} statusLabel={stepStatusLabel} />
          ) : null}
          <ExecutionSources parts={parts} execution={execution} />
          {children ? (
            <div
              className={cn(
                "notebook-ai-work-letter",
                !hasHeading &&
                  !showTraceRow &&
                  "notebook-ai-work-letter--flush",
              )}
            >
              {children}
            </div>
          ) : null}
          {footer ? (
            <div className="notebook-ai-work-footer">{footer}</div>
          ) : null}
          {hasHeading || thinkingLine ? (
            <span
              className="sr-only"
              role="status"
                  aria-atomic="true"
            >
              {hasHeading ? status.label : ""}
              {thinkingLine}
            </span>
          ) : null}
        </section>
      </WorkCardStatusContext.Provider>
    </PlanReviewProvider>
  );
}
