import { tool } from "ai";
import type { RunWriteScope } from "../resourceScope";
import type { NotebookAiAgentContext } from "../types";
import { executePreparedBatchPlan, prepareBatchPlan } from "./executor";
import { normalizeBatchPlanInput } from "./input";
import { batchExecutionSummary } from "./executionSummary";

import { executeBatchPlanInputSchema } from "./toolSchema";
export {
  executeBatchPlanInputSchema,
  repairExecuteBatchPlanInput,
} from "./toolSchema";

export async function prepareBatchPlanForApproval(
  input: unknown,
  options: {
    toolCallId: string;
    notebookId: string;
    writeScope?: RunWriteScope;
  },
) {
  const fallbackRunId = `batch-${options.toolCallId}`;
  const normalized = normalizeBatchPlanInput(input, {
    fallbackRunId,
    fallbackTitle: "笔记变更计划",
  });
  if (!normalized) {
    return {
      ok: false as const,
      needsApproval: false,
      toolCallId: options.toolCallId,
      runId: fallbackRunId,
      status: "invalid" as const,
      error: "批量计划参数不完整",
      operationCount: 0,
    };
  }

  const { runId, ...planInput } = normalized;
  try {
    const prepared = await prepareBatchPlan({
      toolCallId: options.toolCallId,
      runId,
      notebookId: options.notebookId,
      input: planInput,
      writeScope: options.writeScope,
    });
    if (!prepared.ok) {
      return {
        ok: false as const,
        needsApproval: false,
        toolCallId: options.toolCallId,
        runId,
        status: "invalid" as const,
        error: prepared.error,
        operationCount: normalized.operations.length,
      };
    }

    const isCreateOnly = normalized.operations.every(
      (operation) => operation.type === "create",
    );
    if (isCreateOnly) {
      try {
        const result = await executePreparedBatchPlan(
          options.toolCallId,
          runId,
        );
        return {
          ok: result.ok,
          needsApproval: false as const,
          toolCallId: options.toolCallId,
          runId,
          status: result.journal.status,
          ...batchExecutionSummary(result),
          selectedCount: result.journal.selectedOperationIds.length,
          canUndo: result.ok || (result.journal.version === 2 && result.results.some((item) => item.ok)),
          ...(result.ok ? {} : { error: result.error }),
          results: result.results,
          operationCount: normalized.operations.length,
        };
      } catch (error) {
        return {
          ok: false as const,
          needsApproval: false as const,
          toolCallId: options.toolCallId,
          runId,
          status: "invalid" as const,
          error: error instanceof Error ? error.message : "批量计划执行失败",
          operationCount: normalized.operations.length,
        };
      }
    }

    return {
      ok: true as const,
      needsApproval: true,
      toolCallId: options.toolCallId,
      runId,
      status: "prepared" as const,
      operationCount: normalized.operations.length,
    };
  } catch (error) {
    return {
      ok: false as const,
      needsApproval: false,
      toolCallId: options.toolCallId,
      runId,
      status: "invalid" as const,
      error: error instanceof Error ? error.message : "批量计划准备失败",
      operationCount: normalized.operations.length,
    };
  }
}

export const executeBatchPlan = tool({
  description:
    '准备并处理笔记变更计划。每项用target:{notebookId,parentId:null或目录ID,pageId:页面ID}绑定真实目的地；source引用只读，不能据此修改。跨本多目标不能省略target或回退当前笔记本。全部为 create 时 prepare 成功后自动写入；含 edit/search_replace/delete 时只生成审批卡，不立即写入。局部修改必须用 search_replace（oldString 须为 readPage 返回的精确片段，newString 可为空表示删除该片段，replaceAll 可选）；若误用 edit 且仅为局部差异，服务端会自动拆成 search_replace。整页重写才用 edit。参数格式：{title:"整理笔记",summary:"更新账号页",operations:[{type:"search_replace",pageId:"page-1",oldString:"旧片段",newString:"新片段"}]}。返回后停止；仅 create 时无需等待审批。',
  inputSchema: executeBatchPlanInputSchema,
  execute: async (input, { experimental_context, toolCallId }) => {
    const context = experimental_context as NotebookAiAgentContext;
    return prepareBatchPlanForApproval(input, {
      toolCallId,
      notebookId: context.notebookId,
      writeScope: context.writeScope,
    });
  },
});
