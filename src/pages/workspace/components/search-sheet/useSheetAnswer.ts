import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/search-sheet/useSheetAnswer.ts#localMessages:1">`
zh-Hans:
  aiCouldnTAnswer: "AI 回答失败"
en:
  aiCouldnTAnswer: "AI couldn’t answer"
`;
const uiText = createTranslator(localMessages);
import { useCallback, useEffect, useRef, useReducer } from "react";
import { getAIAvailability } from "@/lib/ai-provider";
import { runPiReadOnlyAgent } from "@/lib/notebook-ai/pi/readOnlyAgent";
import { useSettings } from "@/stores/useSettings";
import type { Page } from "@/types";
import { buildAgentPrompt, retrieveNotes, type NoteSource } from "./retrieveNotes";
import { expandQueryTerms } from "./expandQuery";

import { sheetAnswerReducer } from "./sheetAnswerState";
export type { SheetAnswer } from "./sheetAnswerState";

/** 问答范围：notebookId 为工具的绑定笔记本；notebookIds 存在时表示「所有笔记本」下允许检索的全部笔记本。 */
export type SheetAskScope = { notebookId: string; notebookIds?: string[]; label: string };

export function useSearchAiAvailable() {
  return useSettings(s => getAIAvailability(s.ai).ok);
}

function readPageSource(result: unknown): NoteSource | null {
  const page = result as { pageId?: unknown; title?: unknown; markdown?: unknown } | null;
  if (typeof page?.pageId !== "string" || typeof page.title !== "string") return null;
  return { id: page.pageId, title: page.title, excerpt: typeof page.markdown === "string" ? page.markdown.slice(0, 200) : "" };
}

/** 搜索面板内的就地问答：先让模型改写检索词，再本地预检索笔记，再用只读 Pi Agent 多步调用工具，流式生成回答。 */
export function useSheetAnswer() {
  useLocale();
  const [state, dispatch] = useReducer(sheetAnswerReducer, { status: "idle" });
  const answer = state.status === "idle" ? null : state;
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    dispatch({ type: "reset" });
  }, []);
  useEffect(() => () => controller.current?.abort(), []);

  const ask = useCallback(async (question: string, candidates: Page[], ranked: Page[], scope: SheetAskScope) => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const requestId = ++sequence.current;
    dispatch({ type: "ask", requestId, question });
    try {
      dispatch({ type: "tool", requestId, tool: "understand" });
      const extraTerms = await expandQueryTerms(question, abort.signal);
      if (abort.signal.aborted) return;
      dispatch({ type: "tool", requestId, tool: null });
      const sources = retrieveNotes(question, candidates, ranked, extraTerms);
      dispatch({ type: "retrieved", requestId, sources });
      const { system, prompt } = buildAgentPrompt(question, sources, scope.label, Boolean(scope.notebookIds));
      const text = await runPiReadOnlyAgent({
        notebookId: scope.notebookId,
        notebookIds: scope.notebookIds,
        systemPrompt: system,
        prompt,
        signal: abort.signal,
        handlers: {
          onText: text => { if (!abort.signal.aborted) dispatch({ type: "chunk", requestId, text }); },
          onToolStart: tool => { if (!abort.signal.aborted) dispatch({ type: "tool", requestId, tool }); },
          onToolEnd: (tool, result, isError) => {
            if (abort.signal.aborted) return;
            dispatch({ type: "tool", requestId, tool: null });
            const source = tool === "readPage" && !isError ? readPageSource(result) : null;
            if (source) dispatch({ type: "source", requestId, source });
          },
        },
      });
      if (!abort.signal.aborted) dispatch({ type: "finish", requestId, text });
    } catch (error) {
      if (abort.signal.aborted) return;
      dispatch({ type: "fail", requestId, error: error instanceof Error ? error.message : uiText("aiCouldnTAnswer") });
    } finally {
      if (controller.current === abort) controller.current = null;
    }
  }, []);

  return { answer, ask, reset };
}
