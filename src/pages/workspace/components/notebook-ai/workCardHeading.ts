import type { ProgressStep } from "./toolProgressModel";
import { getToolProgressFacts } from "./toolProgressFacts";
import type { WorkCardStatusData } from "./workCardStatusContext";
import type { NotebookAiCompletion } from "@/lib/notebook-ai/types";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/workCardHeading.ts#messages:1">`
zh-Hans:
  thePageContentHasChanged: "页面内容已发生变化"
  writeCanceled: "写入已取消"
  failed: "处理失败"
  processing: "处理中"
  awaitingApproval: "等待审批"
  canceled: "已取消"
  undone: "已撤回"
  pending: "待处理"
  complete: "处理完成"
  stopped: "已手动停止"
  timeout: "响应超时"
  disconnected: "连接已中断"
  interrupted: "生成已中断"
  limited: "已达输出上限"
  blocked: "内容受限"
  detailSteps: "{{value1}} 步{{value2}}"
en:
  thePageContentHasChanged: "The page content has changed"
  writeCanceled: "Write canceled"
  failed: "Failed"
  processing: "Processing"
  awaitingApproval: "Awaiting approval"
  canceled: "Canceled"
  undone: "Undone"
  pending: "Pending"
  complete: "Complete"
  stopped: "Stopped manually"
  timeout: "Response timed out"
  disconnected: "Connection interrupted"
  interrupted: "Generation interrupted"
  limited: "Output limit reached"
  blocked: "Content restricted"
  detailSteps: "{{value1}} steps{{value2}}"
ja:
  thePageContentHasChanged: "ページの内容が変更されました"
  writeCanceled: "書き込みをキャンセルしました"
  failed: "処理に失敗しました"
  processing: "処理中"
  awaitingApproval: "承認待ち"
  canceled: "キャンセル済み"
  undone: "取り消し済み"
  pending: "保留中"
  complete: "処理完了"
  stopped: "手動で停止しました"
  timeout: "応答がタイムアウトしました"
  disconnected: "接続が切断されました"
  interrupted: "生成が中断されました"
  limited: "出力上限に達しました"
  blocked: "コンテンツが制限されました"
  detailSteps: "{{value1}} ステップ{{value2}}"
`;
const t = createTranslator(messages);


export type WorkCardPhase = ProgressStep["status"] | Exclude<NotebookAiCompletion, "complete">;

export type WorkCardHeading = {
  status: WorkCardStatusData;
  detail?: string;
  toggle: string;
};

const CONFLICT = "页面内容已发生变化";

export function getWorkCardPhase(
  steps: readonly ProgressStep[],
  isRunning: boolean,
  completion?: NotebookAiCompletion,
): WorkCardPhase {
  if (completion && completion !== "complete") return completion;
  const facts = getToolProgressFacts(steps);
  if (facts.firstError) return "error";
  const latestStatus = facts.lastStep?.status;
  if (
    latestStatus === "approval" ||
    latestStatus === "cancelled" ||
    latestStatus === "undone"
  )
    return latestStatus;
  if (isRunning) return "running";
  if (facts.hasWaiting || facts.hasRunning) return "waiting";
  return "done";
}

export function getWorkCardHeading(
  steps: readonly ProgressStep[],
  phase: WorkCardPhase,
): WorkCardHeading {
  const facts = getToolProgressFacts(steps);
  const n = facts.total;
  const errorStep = facts.firstError;
  const latest =
    errorStep ?? (phase === "running" ? facts.lastRunning : facts.lastStep) ?? facts.lastDone;
  const toggle =
    n === 0 ? "" : t("detailSteps", { value1: n, value2: latest?.label ? ` · ${latest.label}` : "" });

  if (phase === "error") {
    const detail = errorStep?.detail ?? "";
    const conflict = detail.includes(CONFLICT) || detail.includes(t("thePageContentHasChanged"));
    return {
      status: {
        label: conflict ? t("writeCanceled") : t("failed"),
        tone: "danger",
        icon: conflict ? "cancelled" : "error",
      },
      detail,
      toggle,
    };
  }

  if (phase === "running") {
    return {
      status: { get label() { return t("processing"); }, tone: "accent", icon: "running" },
      toggle,
    };
  }

  if (phase === "stopped" || phase === "timeout" || phase === "disconnected" ||
      phase === "interrupted" || phase === "limited" || phase === "blocked") {
    return {
      status: {
        label: t(phase),
        tone: phase === "stopped" ? "neutral" : "warning",
        icon: phase === "stopped" ? "cancelled" : "error",
      },
      toggle,
    };
  }

  const status: WorkCardStatusData =
    phase === "approval"
      ? { get label() { return t("awaitingApproval"); }, tone: "warning", icon: "waiting" }
      : phase === "cancelled"
        ? { get label() { return t("canceled"); }, tone: "neutral", icon: "cancelled" }
        : phase === "undone"
          ? { get label() { return t("undone"); }, tone: "neutral", icon: "undone" }
          : phase === "waiting"
            ? { get label() { return t("pending"); }, tone: "warning", icon: "waiting" }
            : { get label() { return t("complete"); }, tone: "success", icon: "done" };
  return { status, toggle };
}
