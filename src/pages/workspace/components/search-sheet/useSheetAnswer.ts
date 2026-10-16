import { useCallback, useEffect, useRef, useState } from "react";
import { getAIAvailability, runAITextStream } from "@/lib/ai-provider";
import { useSettings } from "@/stores/useSettings";
import type { Page } from "@/types";
import { buildAnswerPrompt, retrieveNotes, type NoteSource } from "./retrieveNotes";

export interface SheetAnswer {
  question: string;
  sources: NoteSource[];
  text: string;
  status: "loading" | "streaming" | "done" | "error";
  error?: string;
}

export function useSearchAiAvailable() {
  return useSettings(s => getAIAvailability(s.ai).ok);
}

/** 搜索面板内的就地问答：检索相关笔记片段，流式生成带引用的回答。 */
export function useSheetAnswer() {
  const [answer, setAnswer] = useState<SheetAnswer | null>(null);
  const controller = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setAnswer(null);
  }, []);
  useEffect(() => () => controller.current?.abort(), []);

  const ask = useCallback(async (question: string, candidates: Page[], ranked: Page[]) => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setAnswer({ question, sources: [], text: "", status: "loading" });
    const sources = await retrieveNotes(question, candidates, ranked).catch(() => [] as NoteSource[]);
    if (abort.signal.aborted) return;
    setAnswer({ question, sources, text: "", status: "loading" });
    const ai = useSettings.getState().ai;
    const modelId = ai.workspaceSelectedModelId?.trim() || ai.selectedModelId;
    try {
      const text = await runAITextStream(ai, buildAnswerPrompt(question, sources), {
        abortSignal: abort.signal,
        requestOverrides: { selectedModelId: modelId },
        onUpdate: update => {
          if (abort.signal.aborted || !update.text) return;
          setAnswer(prev => prev && { ...prev, text: update.text, status: "streaming" });
        },
      });
      if (!abort.signal.aborted) setAnswer(prev => prev && { ...prev, text: text || prev.text, status: "done" });
    } catch (error) {
      if (abort.signal.aborted) return;
      setAnswer(prev => prev && { ...prev, status: "error", error: error instanceof Error ? error.message : "AI 回答失败" });
    } finally {
      if (controller.current === abort) controller.current = null;
    }
  }, []);

  return { answer, ask, reset };
}
