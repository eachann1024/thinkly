import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import { askNotebookAi } from "../notebook-ai/approval/refinePlan";
import { useSearchSession, type SearchScope } from "../sidebar/useSearchSession";
import type { SearchResultPage } from "../command/useCommandSearch";
import type { Page } from "@/types";
import type { SheetAnswer } from "./sheetAnswerState";
import type { SheetAskScope } from "./useSheetAnswer";
import { openSheetConversation, saveSheetConversation } from "./saveSheetConversation";

type SheetActionsInput = {
  aiNotebookId: string | null;
  aiQuery: string;
  notebookNames: Record<string, string>;
  getCandidates: () => Page[];
  ranked: Page[];
  answer: SheetAnswer | null;
  ask: (question: string, candidates: Page[], ranked: Page[], scope: SheetAskScope) => Promise<void>;
  pending: boolean;
  deferredQuery: string;
  scope: SearchScope;
  composingRef: MutableRefObject<boolean>;
  returnFocusRef: MutableRefObject<HTMLElement | null>;
  skipRestoreRef: MutableRefObject<boolean>;
  /** 浮动搜索窗：结果交给主窗打开，不走本窗口的标签导航。 */
  onOpenResult?: (page: SearchResultPage) => void;
};

/** 搜索面板的打开结果、提问 AI 与转入 AI 面板动作。 */
export function useSheetActions(input: SheetActionsInput) {
  const { aiNotebookId, aiQuery, notebookNames, getCandidates, ranked, answer, ask, pending, deferredQuery, scope, composingRef, returnFocusRef, skipRestoreRef, onOpenResult } = input;
  const savedConversation = useRef<{ requestId: number; id: string } | null>(null);
  useEffect(() => {
    if (!aiNotebookId || answer?.status !== "done" || !answer.text || savedConversation.current?.requestId === answer.requestId) return;
    savedConversation.current = { requestId: answer.requestId, id: saveSheetConversation(aiNotebookId, answer) };
  }, [aiNotebookId, answer]);

  const askAi = () => {
    if (!aiQuery) return;
    const latestScope = useSearchSession.getState().scope;
    const candidates = getCandidates();
    if (latestScope.kind === "all") {
      const notebookIds = [...new Set(candidates.map(page => page.workspaceId))];
      const label = `所有笔记本（${notebookIds.map(id => notebookNames[id] ?? id).join("、")}）`;
      void ask(aiQuery, candidates, ranked, { notebookId: aiNotebookId ?? notebookIds[0] ?? "", notebookIds, label });
      return;
    }
    const notebookId = latestScope.notebookId ?? aiNotebookId ?? "";
    void ask(aiQuery, candidates, ranked, { notebookId, label: notebookNames[notebookId] ?? notebookId });
  };
  const continueInPanel = aiNotebookId && answer ? () => {
    skipRestoreRef.current = true;
    useSearchSession.getState().closeSearch();
    const saved = savedConversation.current;
    if (saved?.requestId === answer.requestId) openSheetConversation(aiNotebookId, saved.id);
    else askNotebookAi({ notebookId: aiNotebookId, text: answer.question });
  } : undefined;
  const openSource = (id: string) => {
    returnFocusRef.current = null;
    useSearchSession.getState().targetPage(id, true);
  };
  const openResult = useCallback((page: SearchResultPage) => {
    const latest = useSearchSession.getState();
    if (pending || composingRef.current || latest.view.phase === "closed" || latest.query !== deferredQuery || latest.scope !== scope) return;
    returnFocusRef.current = null;
    if (onOpenResult) onOpenResult(page);
    else latest.targetPage(page.id, true);
  }, [deferredQuery, scope, pending, composingRef, returnFocusRef, onOpenResult]);
  return { askAi, continueInPanel, openSource, openResult };
}
