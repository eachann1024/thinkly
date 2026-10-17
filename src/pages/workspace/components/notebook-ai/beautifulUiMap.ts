import { formatDecimal, formatNumber } from "@/i18n/format";
import {
  getToolProgressStepStatus,
  getToolProgressStepText,
  type ProgressStep,
  type ToolProgressPart,
} from "./toolProgressModel";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/beautifulUiMap.ts#messages:1">`
zh-Hans:
  thisStepWasNotCompletedAndMayHave: "本步骤未完成，可能已被本轮生成跳过。"
  searching: "正在搜索"
  runningTools: "正在运行工具"
  thinking: "思考中"
  processing: "处理中"
  searchComplete: "已搜索"
  detailToolsRun: "已运行 {{value1}} 个工具"
  detailThoughtFor: "思考了 {{value1}}"
  detailProcessedFor: "处理了 {{value1}}"
en:
  thisStepWasNotCompletedAndMayHave: "This step was not completed and may have been skipped in this response."
  searching: "Searching"
  runningTools: "Running tools"
  thinking: "Thinking"
  processing: "Processing"
  searchComplete: "Search complete"
  detailToolsRun: "Tools run: {{value1}}"
  detailThoughtFor: "Thought for {{value1}}"
  detailProcessedFor: "Processed for {{value1}}"
ja:
  thisStepWasNotCompletedAndMayHave: "このステップは完了しておらず、今回の生成でスキップされた可能性があります。"
  searching: "検索中"
  runningTools: "ツールを実行中"
  thinking: "思考中"
  processing: "処理中"
  searchComplete: "検索完了"
  detailToolsRun: "{{value1}} 個のツールを実行しました"
  detailThoughtFor: "{{value1}}思考しました"
  detailProcessedFor: "{{value1}}処理しました"
`;
const t = createTranslator(messages);


export type LoaderChipStatus = "pending" | "running" | "done" | "error";
export type LoaderTaskStatus =
  | "pending"
  | "running"
  | "done"
  | "error"
  | "failed";
export type ThinkingTraceVariant = "Steps" | "Reasoning" | "Search" | "Coding";

export type ToolChipView = {
  id: string;
  name: string;
  status: LoaderChipStatus;
  label: string;
};

export type ToolTaskRowView = {
  id: string;
  title: string;
  status: LoaderTaskStatus;
  detail?: string;
};

export type ThinkingTraceView = {
  variant: ThinkingTraceVariant;
  activeLabel: string;
  doneLabel: string;
  rows: { primary: string; secondary?: string }[];
};

export type ThinkingTraceStepInput = {
  label: string;
  detail?: string;
  status?: ProgressStep["status"] | string;
};

function chipStatusFromStep(status: ProgressStep["status"]): LoaderChipStatus {
  if (status === "waiting" || status === "approval") return "pending";
  if (status === "cancelled" || status === "undone") return "done";
  return status;
}

function taskStatusFromStep(status: ProgressStep["status"]): LoaderTaskStatus {
  if (status === "waiting" || status === "approval") return "pending";
  if (status === "cancelled" || status === "undone") return "done";
  if (status === "error") return "failed";
  return status;
}

function partId(part: ToolProgressPart, index: number): string {
  return part.toolCallId?.trim() || `${part.type}:${index}`;
}

/** LoadingState 等宽耗时：<60s 用 `12.3s`，否则 `1m 2.3s` */
export function formatLoaderElapsed(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  if (total < 60) return `${formatDecimal(total, 1)}s`;
  return `${formatNumber(Math.floor(total / 60))}m ${formatDecimal(total % 60, 1)}s`;
}

export function mapToolPartsToChips(
  parts: ToolProgressPart[],
  isMessageStreaming?: boolean,
): ToolChipView[] {
  return parts.map((part, index) => {
    const text = getToolProgressStepText(part);
    return {
      id: partId(part, index),
      name: text.label,
      status: chipStatusFromStep(
        getToolProgressStepStatus(part, isMessageStreaming),
      ),
      label: text.detail,
    };
  });
}

export function mapToolPartsToTaskRows(
  parts: ToolProgressPart[],
  isMessageStreaming?: boolean,
): ToolTaskRowView[] {
  return parts.map((part, index) => {
    const text = getToolProgressStepText(part);
    const status = getToolProgressStepStatus(part, isMessageStreaming);
    return {
      id: partId(part, index),
      title: text.label,
      status: taskStatusFromStep(status),
      detail:
        status === "waiting"
          ? t("thisStepWasNotCompletedAndMayHave")
          : text.detail,
    };
  });
}

function inferThinkingVariant(
  steps: ThinkingTraceStepInput[],
): ThinkingTraceVariant {
  const haystack = steps
    .map((step) => `${step.label} ${step.detail ?? ""}`)
    .join("\n");
  if (/搜索|联网|查找|检索|search|web|lookup/i.test(haystack)) return "Search";
  if (/写入|创建|修改|追加|替换|重命名|删除|代码|命令|write|create|edit|update|append|replace|rename|delete|code|command/i.test(haystack))
    return "Coding";
  if (/思考|推理|分析|think|reason|analy/i.test(haystack)) return "Reasoning";
  return "Steps";
}

export function mapStepsToThinkingTrace(
  steps: ThinkingTraceStepInput[],
  elapsedMs: number,
): ThinkingTraceView {
  const variant = inferThinkingVariant(steps);
  const elapsed = formatLoaderElapsed(Math.max(0, elapsedMs));
  const activeLabel =
    variant === "Search"
      ? t("searching")
      : variant === "Coding"
        ? t("runningTools")
        : variant === "Reasoning"
          ? t("thinking")
          : t("processing");
  const doneLabel =
    variant === "Search"
      ? t("searchComplete")
      : variant === "Coding"
        ? t("detailToolsRun", { value1: steps.length })
        : variant === "Reasoning"
          ? t("detailThoughtFor", { value1: elapsed })
          : t("detailProcessedFor", { value1: elapsed });

  return {
    variant,
    activeLabel,
    doneLabel,
    rows: steps.map((step) => ({
      primary: step.label,
      ...(step.detail ? { secondary: step.detail } : {}),
    })),
  };
}

/** 真值立即亮；假值可被 held 粘住。对应 useMinHoldActive 的可见性合成。 */
export function resolveLoaderHold(active: boolean, held: boolean): boolean {
  return active || held;
}
