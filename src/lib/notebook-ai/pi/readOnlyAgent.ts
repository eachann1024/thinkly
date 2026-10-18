import { Agent, type AgentEvent } from "@earendil-works/pi-agent-core";
import type { NotebookAiAgentContext } from "../types";
import { buildPiLanguageModel } from "./model";
import { buildPiDomainTools } from "./tools";
import { ALWAYS_ON_CARD_TOOLS } from "../tools";

/** 只读工具白名单：不含 executeBatchPlan 等写入类工具，也不需要 loadSkill 渐进开放。 */
export const READ_ONLY_TOOL_NAMES = ["searchNotes", "readPage", "listPages", "searchWeb", "readWebPage", ...ALWAYS_ON_CARD_TOOLS] as const;
export type ReadOnlyToolName = (typeof READ_ONLY_TOOL_NAMES)[number];

const MAX_TURNS = 8;

export type ReadOnlyAgentHandlers = {
  onText: (text: string) => void;
  /** 推理文本（累计值）；模型不输出推理时不会触发 */
  onThinking?: (text: string) => void;
  onToolStart: (name: string, args: unknown) => void;
  onToolEnd: (name: string, result: unknown, isError: boolean) => void;
};

/**
 * 复用侧栏 Pi 运行时与领域工具，跑一次只读的多步问答；返回最终文本。
 * 每次调用新建 Agent，不保留历史。
 */
export async function runPiReadOnlyAgent(options: {
  notebookId: string;
  /** 跨笔记本检索的允许范围，见 NotebookAiAgentContext.notebookIds */
  notebookIds?: string[];
  systemPrompt: string;
  prompt: string;
  signal: AbortSignal;
  handlers: ReadOnlyAgentHandlers;
}): Promise<string> {
  const { notebookId, notebookIds, systemPrompt, prompt, signal, handlers } = options;
  const modelResult = buildPiLanguageModel();
  if (!modelResult.ok) throw new Error(modelResult.reason);

  const agentContext: NotebookAiAgentContext = { notebookId, notebookIds, currentPageId: null, loadedSkills: new Set() };
  const allowed = new Set<string>(READ_ONLY_TOOL_NAMES);
  const tools = buildPiDomainTools(agentContext).filter(tool => allowed.has(tool.name));

  const agent = new Agent({
    initialState: { systemPrompt, model: modelResult.model, thinkingLevel: "off", tools },
    streamFn: modelResult.models.streamSimple.bind(modelResult.models),
    getApiKey: async () => (await modelResult.models.getAuth(modelResult.model))?.auth.apiKey,
    toolExecution: "sequential",
  });

  let text = "";
  let turns = 0;
  let messageHasText = false;
  let thinking = "";
  const unsub = agent.subscribe(async (event: AgentEvent) => {
    if (event.type === "turn_start" && ++turns > MAX_TURNS) agent.abort();
    if (event.type === "message_start") messageHasText = false;
    if (event.type === "message_update") {
      const update = event.assistantMessageEvent;
      if (update.type === "thinking_delta" && update.delta) {
        thinking += update.delta;
        handlers.onThinking?.(thinking);
        return;
      }
      if (update.type !== "text_delta" || !update.delta) return;
      if (!messageHasText && text) text += "\n\n";
      messageHasText = true;
      text += update.delta;
      handlers.onText(text);
    }
    if (event.type === "tool_execution_start") handlers.onToolStart(event.toolName, event.args);
    if (event.type === "tool_execution_end") handlers.onToolEnd(event.toolName, event.result?.details ?? event.result, event.isError);
  });
  const onAbort = () => agent.abort();
  signal.addEventListener("abort", onAbort);
  try {
    await agent.prompt(prompt);
    await agent.waitForIdle();
    const error = agent.state.errorMessage;
    if (error && !signal.aborted) throw new Error(error);
    return text;
  } finally {
    unsub();
    signal.removeEventListener("abort", onAbort);
  }
}
