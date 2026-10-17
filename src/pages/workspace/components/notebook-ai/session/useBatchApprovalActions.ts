import { useLocale } from "@/i18n";
import { useCallback } from "react";
import { batchExecutionSummary } from "@/lib/notebook-ai/batch-plan/executionSummary";
import { toast } from "@/components/ui/sonner";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import {
  executePreparedBatchPlan,
  undoBatchPlan,
  updateBatchPlanSelection,
} from "@/lib/notebook-ai/batch-plan";
import { reloadEditorIfActive } from "@/lib/notebook-ai/liveWriter";
import { updatePlanMessages } from "../approval/updatePlanMessages";
import { formatNotebookAiError } from "@/lib/notebook-ai/errors";
import type {
  BatchApprovalResponse,
  BatchUndoResult,
} from "../ApprovalPlanCard";
import type { SessionState } from "./useSessionState";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/session/useBatchApprovalActions.ts#messages:1">`
zh-Hans:
  theUserCanceledTheEntirePlan: "用户取消了整批计划"
  thisPlanHasExpiredAskAiToGenerate: "当前执行计划已过期，请重新向 AI 发起指令生成新计划"
  couldNotApplyTheBatchPlan: "批量计划执行失败"
  conversationChangedOutdatedResultsWereIgnored: "会话已切换，已忽略过期结果"
  couldNotUndoAllChangesInThisBatch: "无法完整撤回本批变更"
  changesInThisBatchUndone: "已撤回本批变更"
  undoFailed: "撤回失败"
en:
  theUserCanceledTheEntirePlan: "The user canceled the entire plan"
  thisPlanHasExpiredAskAiToGenerate: "This plan has expired. Ask AI to generate a new one."
  couldNotApplyTheBatchPlan: "Could not apply the batch plan"
  conversationChangedOutdatedResultsWereIgnored: "Conversation changed. Outdated results were ignored."
  couldNotUndoAllChangesInThisBatch: "Could not undo all changes in this batch"
  changesInThisBatchUndone: "Changes in this batch undone"
  undoFailed: "Undo failed"
ja:
  theUserCanceledTheEntirePlan: "ユーザーが一括プラン全体をキャンセルしました"
  thisPlanHasExpiredAskAiToGenerate: "このプランは有効期限が切れました。AI にもう一度指示して新しいプランを生成してください"
  couldNotApplyTheBatchPlan: "一括プランを実行できませんでした"
  conversationChangedOutdatedResultsWereIgnored: "会話が切り替わったため、古い結果は無視されました"
  couldNotUndoAllChangesInThisBatch: "この一括変更をすべて取り消すことができませんでした"
  changesInThisBatchUndone: "この一括変更を取り消しました"
  undoFailed: "取り消しに失敗しました"
`;
const t = createTranslator(messages);


export function useBatchApprovalActions(state: SessionState) {
  useLocale();
  const {
    currentSessionScope,
    isCurrentSession,
    setMessages,
    notebookId,
    conversationId,
  } = state;
  const onBatchApproval = useCallback(
    async (response: BatchApprovalResponse) => {
      const scope = currentSessionScope;
      const replaceToolPart = (
        state:
          | "approval-responded"
          | "output-available"
          | "output-denied"
          | "output-error",
        payload: { output?: unknown; errorText?: string } = {},
      ) => {
        if (!isCurrentSession(scope)) return;
        setMessages((current) => {
          const cleanedMessages = updatePlanMessages(
            current,
            response.toolCallId,
            (part) => ({
              ...part,
              state,
              ...(payload.output !== undefined
                ? { output: payload.output }
                : {}),
              ...(payload.errorText ? { errorText: payload.errorText } : {}),
              approval: {
                id: response.approvalId,
                approved: response.approved,
                reason: response.approved
                  ? `用户批准执行 ${response.selectedOperationIds.length} 项操作`
                  : "用户取消了整批计划",
              },
            }),
          );
          useNotebookAiChats
            .getState()
            .setMessages(notebookId, conversationId, cleanedMessages);
          return cleanedMessages;
        });
      };

      if (!response.approved) {
        replaceToolPart("output-denied");
        return;
      }

      const journal = updateBatchPlanSelection(
        response.toolCallId,
        response.runId,
        response.selectedOperationIds,
      );
      if (!journal) {
        toast.error(t("thisPlanHasExpiredAskAiToGenerate"));
        return;
      }

      replaceToolPart("approval-responded");
      try {
        const result = await executePreparedBatchPlan(
          response.toolCallId,
          response.runId,
        );
        replaceToolPart("output-available", {
          output: {
            ok: result.ok,
            toolCallId: response.toolCallId,
            runId: response.runId,
            status: result.journal.status,
            ...batchExecutionSummary(result),
            selectedCount: result.journal.selectedOperationIds.length,
            canUndo: result.ok && result.journal.status === "completed",
            ...(result.ok ? {} : { error: result.error }),
            results: result.results,
          },
        });
      } catch (executeError) {
        replaceToolPart("output-error", {
          errorText:
            executeError instanceof Error
              ? executeError.message
              : t("couldNotApplyTheBatchPlan"),
        });
      }
    },
    [conversationId, currentSessionScope, isCurrentSession, notebookId, setMessages],
  );

  const onBatchUndo = useCallback(
    async (toolCallId: string, runId: string): Promise<BatchUndoResult> => {
      const scope = currentSessionScope;
      try {
        const result = await undoBatchPlan(toolCallId, runId);
        if (!isCurrentSession(scope)) {
          return { ok: false, error: t("conversationChangedOutdatedResultsWereIgnored") };
        }
        if (!result.ok) {
          toast.error(t("couldNotUndoAllChangesInThisBatch"), {
            description: formatNotebookAiError(result.error, { phase: "undo" }),
          });
          return {
            ok: false,
            status: result.journal.status,
            conflictCount: result.journal.status === "undo-conflicted" ? 1 : 0,
            error: result.error,
          };
        }

        const pageIds = new Set(
          result.results.flatMap((operation) => operation.pageIds),
        );
        pageIds.forEach(reloadEditorIfActive);
        setMessages((current) => {
          const cleanedMessages = updatePlanMessages(
            current,
            toolCallId,
            (part) => ({
              ...part,
              output: {
                ...(part.output && typeof part.output === "object"
                  ? (part.output as Record<string, unknown>)
                  : {}),
                status: "undone",
                canUndo: false,
              },
            }),
          );
          useNotebookAiChats
            .getState()
            .setMessages(notebookId, conversationId, cleanedMessages);
          return cleanedMessages;
        });
        toast.success(t("changesInThisBatchUndone"));
        return {
          ok: true,
          status: "reverted",
          revertedCount: result.results.filter((operation) => operation.ok)
            .length,
        };
      } catch (undoError) {
        if (!isCurrentSession(scope)) {
          return { ok: false, error: t("conversationChangedOutdatedResultsWereIgnored") };
        }
        const description = formatNotebookAiError(undoError, { phase: "undo" });
        toast.error(t("undoFailed"), { description });
        return { ok: false, error: description };
      }
    },
    [conversationId, currentSessionScope, isCurrentSession, notebookId, setMessages],
  );

  return { onBatchApproval, onBatchUndo };
}
