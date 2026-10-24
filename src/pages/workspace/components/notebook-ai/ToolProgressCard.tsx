import { useLocale } from "@/i18n";
import { Button } from "@/components/ui/button";
import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PlanReviewProvider } from "./approval/PlanReviewContext";
import { visibleBusyTickerLine } from "@/components/editor/ai/inlineBusyTicker";
import {
  ORB_VISIBLE_MIN_MS,
  useMinHoldActive,
} from "@/components/ui/ai-motion";
import { cn } from "@/lib/utils";
import { resolveLoaderHold } from "./beautifulUiMap";
import {
  buildToolProgressSteps,
  getToolProgressStepStatus,
  getToolProgressSummary,
  type ProgressStep,
  type ToolProgressPart,
} from "./toolProgressModel";
import { getWorkCardHeading, getWorkCardPhase } from "./workCardHeading";
import { WorkCardStatus } from "./WorkCardStatus";
import { ToolProgressSteps } from "./ToolProgressSteps";
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

function FoldChevron() {
  return (
    <svg
      className="notebook-ai-work-chev"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

interface ToolProgressCardProps {
  parts: ToolProgressPart[];
  isMessageStreaming?: boolean;
  thinkingText?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

function WorkCardTraceRow({
  foldable,
  open,
  label,
  thinkingLine,
  running,
  onToggle,
}: {
  foldable: boolean;
  open: boolean;
  label: string;
  thinkingLine: string;
  running: boolean;
  onToggle: () => void;
}) {
  const reduce = useReducedMotion();
  const body = (
    <>
      {foldable ? <FoldChevron /> : null}
      {label ? (
        <span className="notebook-ai-work-toggle-label">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={label}
              className={cn("notebook-ai-work-toggle-text", running && "ai-shimmer-text")}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 480, damping: 38 }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </span>
      ) : null}
      {thinkingLine ? (
        <span
          className="notebook-ai-work-think"
          title={thinkingLine}
          aria-live="polite"
        >
          {thinkingLine}
        </span>
      ) : null}
    </>
  );

  if (foldable) {
    return (
      <Button contentStyle="preserve" variant="ghost" size={null}
        type="button"
        className="notebook-ai-work-toggle"
        aria-expanded={open}
        onClick={onToggle}
      >
        {body}
      </Button>
    );
  }

  return (
    <p className="notebook-ai-work-toggle notebook-ai-work-toggle--static">
      {body}
    </p>
  );
}

export function ToolProgressCard({
  parts,
  isMessageStreaming,
  thinkingText,
  children,
  footer,
}: ToolProgressCardProps) {
  const locale = useLocale();
  const steps = useMemo(
    () => buildToolProgressSteps(parts, isMessageStreaming),
    [parts, isMessageStreaming, locale],
  );
  const thinkingLine = visibleBusyTickerLine(thinkingText ?? "");
  const hasThinking = thinkingLine.length > 0;

  const hasError = steps.some((step) => step.status === "error");
  const isRunning =
    !hasError &&
    (Boolean(isMessageStreaming) ||
      steps.some((step) => step.status === "running"));
  const heldRunning = useMinHoldActive(isRunning, ORB_VISIBLE_MIN_MS);
  const showRunning = resolveLoaderHold(isRunning, heldRunning);
  const phase = getWorkCardPhase(steps, showRunning);
  const heading = getWorkCardHeading(steps, phase);
  const [approvalStatus, setApprovalStatus] =
    useState<WorkCardStatusData | null>(null);
  const status = approvalStatus ?? heading.status;
  const showProcessing = status.icon === "running";
  const [open, setOpen] = useState(false);
  const foldable = steps.length > 0;
  const traceLabel = foldable ? heading.toggle : hasThinking ? t("thinking") : "";
  const showTraceRow = foldable || hasThinking;
  const hasHeading = foldable || showRunning;

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
            <WorkCardTraceRow
              foldable={foldable}
              open={open}
              label={traceLabel}
              thinkingLine={thinkingLine}
              running={showProcessing}
              onToggle={() => setOpen((value) => !value)}
            />
          ) : null}
          <AnimatePresence initial={false}>
            {foldable && open ? (
              <ToolProgressSteps key="steps" steps={steps} statusLabel={stepStatusLabel} />
            ) : null}
          </AnimatePresence>
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
              aria-live="polite"
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
