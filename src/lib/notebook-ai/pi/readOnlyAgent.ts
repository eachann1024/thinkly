import { Agent, type AgentEvent } from "@earendil-works/pi-agent-core";
import type { NotebookAiAgentContext } from "../types";
import { buildPiLanguageModel } from "./model";
import { buildPiDomainTools } from "./tools";
import { READ_ONLY_TOOL_NAMES } from "../toolAccess";
export { READ_ONLY_TOOL_NAMES } from "../toolAccess";

export type ReadOnlyToolName = (typeof READ_ONLY_TOOL_NAMES)[number];

const MAX_TURNS = 8;

export type ReadOnlyAgentHandlers = {
  onText: (text: string) => void;
  onThinking?: (text: string) => void;
  onToolStart: (name: string, args: unknown) => void;
  onToolEnd: (name: string, result: unknown, isError: boolean) => void;
};

export async function runPiReadOnlyAgent(options: {
  notebookId: string;
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
