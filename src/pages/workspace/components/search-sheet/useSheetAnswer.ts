import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/search-sheet/useSheetAnswer.ts#localMessages:1">`
zh-Hans:
  aiCouldnTAnswer: "AI 回答失败"
en:
  aiCouldnTAnswer: "AI couldn’t answer"
`;
const uiText = createTranslator(localMessages);
import { useCallback, useEffect, useRef, useReducer } from "react";
import { getAIAvailability, runAITextStream } from "@/lib/ai-provider";
import { useSettings } from "@/stores/useSettings";
import type { Page } from "@/types";
import { expandQuery } from "./expandQuery";
import { buildAnswerPrompt, retrieveNotes } from "./retrieveNotes";

import { sheetAnswerReducer } from "./sheetAnswerState";
export type { SheetAnswer } from "./sheetAnswerState";

export function useSearchAiAvailable() {
  return useSettings(s => getAIAvailability(s.ai).ok);
}

/** 搜索面板内的就地问答：检索相关笔记片段，流式生成带引用的回答。 */
export function useSheetAnswer() {
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

  const ask = useCallback(async (question: string, candidates: Page[], ranked: Page[]) => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const requestId = ++sequence.current;
    dispatch({ type: "ask", requestId, question });
    try {
      const extraTerms = await expandQuery(question, abort.signal);
      if (abort.signal.aborted) return;
      const sources = retrieveNotes(question, candidates, ranked, extraTerms);
      dispatch({ type: "retrieved", requestId, sources });
      const ai = useSettings.getState().ai;
      const modelId = ai.workspaceSelectedModelId?.trim() || ai.selectedModelId;
      const text = await runAITextStream(ai, buildAnswerPrompt(question, sources), {
        abortSignal: abort.signal,
        requestOverrides: { selectedModelId: modelId },
        onUpdate: update => {
          if (abort.signal.aborted || !update.text) return;
          dispatch({ type: "chunk", requestId, text: update.text });
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
