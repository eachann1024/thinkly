import type { ProgressStep } from "./toolProgressModel";
import type { WorkCardStatusData } from "./workCardStatusContext";
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
  detailSteps: "{{value1}} ステップ{{value2}}"
`;
const t = createTranslator(messages);


export type WorkCardPhase = ProgressStep["status"];

export type WorkCardHeading = {
  status: WorkCardStatusData;
  detail?: string;
  toggle: string;
};

const CONFLICT = "页面内容已发生变化";

function lastOf(
  steps: readonly ProgressStep[],
  status: ProgressStep["status"],
): ProgressStep | undefined {
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    if (steps[i]?.status === status) return steps[i];
  }
  return undefined;
}

export function getWorkCardPhase(
  steps: readonly ProgressStep[],
  isRunning: boolean,
): WorkCardPhase {
  if (steps.some((step) => step.status === "error")) return "error";
  const latestStatus = steps.at(-1)?.status;
  if (
    latestStatus === "approval" ||
    latestStatus === "cancelled" ||
    latestStatus === "undone"
  )
    return latestStatus;
  if (isRunning) return "running";
  if (steps.some((step) => step.status === "waiting")) return "waiting";
  return "done";
}

export function getWorkCardHeading(
  steps: readonly ProgressStep[],
  phase: WorkCardPhase,
): WorkCardHeading {
  const n = steps.length;
  const errorStep = steps.find((step) => step.status === "error");
  const runningStep = lastOf(steps, "running");
  const doneStep = lastOf(steps, "done");
  const latest =
    errorStep ?? (phase === "running" ? runningStep : steps[n - 1]) ?? doneStep;
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
