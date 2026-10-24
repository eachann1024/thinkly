import { ToolLoopAgent, hasToolCall, stepCountIs } from "ai";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { buildLanguageModel } from "./model";
import { notebookAiTools } from "./tools";
import {
  getSkillToolNames,
  NOTEBOOK_AGENT_INSTRUCTIONS,
} from "./skills";
import { getCurrentNotebookAiPageId } from "./context";
import { readGlobalAgentsPrompt } from "./localContext";
import { useSettings } from "@/stores/useSettings";
import { repairExecuteBatchPlanInput } from "./batch-plan/tool";
import type { ModelAvailability } from "./model";
import type { NotebookAiAgentContext } from "./types";
import { formatRunWriteScope, resolveRunCurrentPageId, type NotebookAiRunContext } from "./runContext";

function buildSystemPrompt(
  notebookId: string,
  currentPageId?: string | null,
): string {
  const notebook = useNotebooks.getState().notebooks[notebookId];
  const notebookName = notebook?.name ?? "未知笔记本";

  const pages = usePages.getState().pages;
  const activePageId = resolveRunCurrentPageId(currentPageId, () => getCurrentNotebookAiPageId(notebookId));
  const activePage =
    activePageId && pages[activePageId]?.workspaceId === notebookId
      ? pages[activePageId]
      : undefined;
  const activePageLine =
    activePage && !activePage.trashedAt
      ? `[${activePage.id}] ${getPageTitle(activePage)}`
      : "（无当前打开页面）";

  const globalPrompt = useSettings.getState().ai.readGlobalPrompt
    ? readGlobalAgentsPrompt()
    : "";

  return `${NOTEBOOK_AGENT_INSTRUCTIONS}

${globalPrompt ? `# 用户全局提示词\n\n${globalPrompt}\n` : ""}
# 当前上下文

- 当前笔记本：${notebookName}
- 当前笔记本 id：${notebookId}
- 当前打开页面：${activePageLine}`;
}

export type BuildAgentResult =
  | { ok: true; agent: ToolLoopAgent<never, typeof notebookAiTools> }
  | { ok: false; reason: string };

export function buildNotebookAgent(
  notebookId: string,
  currentPageId?: string | null,
  runContext: NotebookAiRunContext = {},
): BuildAgentResult {
  const agentContext: NotebookAiAgentContext = {
    notebookId,
    currentPageId: resolveRunCurrentPageId(currentPageId, () => getCurrentNotebookAiPageId(notebookId)),
    ...runContext,
    loadedSkills: new Set(runContext.loadedSkills),
  };
  const modelResult: ModelAvailability = buildLanguageModel();
  if (!modelResult.ok) {
    return { ok: false, reason: modelResult.reason };
  }

  const agent = new ToolLoopAgent({
    model: modelResult.model,
    tools: notebookAiTools,
    instructions: [buildSystemPrompt(notebookId, agentContext.currentPageId),
      agentContext.writeScope ? formatRunWriteScope(agentContext.writeScope) : ""].filter(Boolean).join("\n\n"),
    stopWhen: [hasToolCall("executeBatchPlan"), stepCountIs(16)],
    experimental_context: agentContext,
    prepareStep: () => {
      const activeTools = [
        "loadSkill",
        ...getSkillToolNames(agentContext.loadedSkills),
      ] as Array<keyof typeof notebookAiTools>;
      return { activeTools };
    },
    experimental_repairToolCall: async ({ toolCall }) => {
      if (toolCall.toolName !== "executeBatchPlan") return null;
      const input = repairExecuteBatchPlanInput(toolCall.input);
      return input ? { ...toolCall, input } : null;
    },
  });

  return { ok: true, agent };
}
