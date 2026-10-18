import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import { askNotebookAi } from "../notebook-ai/approval/refinePlan";
import { useSearchSession, type SearchScope } from "../sidebar/useSearchSession";
import type { SearchResultPage } from "../command/useCommandSearch";
import type { SearchWindowCommand } from "@/lib/electron/searchWindow";
import { usePages } from "@/stores/usePages";
import type { Page } from "@/types";
import { visibleSources, type SheetAnswer } from "./sheetAnswerState";
import type { SheetAskScope } from "./useSheetAnswer";
import { openSheetConversation, saveSheetConversation } from "./saveSheetConversation";

type SheetActionsInput = {
  aiNotebookId: string | null;
  aiQuery: string;
  /** 询问 AI 用完整输入（含 @、Skill、图片名）；缺省时退回检索词。 */
  getQuestion?: () => string;
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
  onOpenResult?: (page: { id: string; localFilePath?: string }) => void;
  /** 浮动搜索窗：续聊交给主窗写入并打开 AI 面板，本窗不落聊天记录。 */
  onCommand?: (command: SearchWindowCommand) => void | Promise<boolean | void>;
};

/** 搜索面板的打开结果、提问 AI 与转入 AI 面板动作。 */
export function useSheetActions(input: SheetActionsInput) {
  const { aiNotebookId, aiQuery, getQuestion, notebookNames, getCandidates, ranked, answer, ask, pending, deferredQuery, scope, composingRef, returnFocusRef, skipRestoreRef, onOpenResult, onCommand } = input;
  const savedConversation = useRef<{ requestId: number; id: string } | null>(null);
  const handedOff = useRef<{ requestId: number; token: string } | null>(null);
  const reasked = useRef<number | null>(null);
  const tokenFor = (requestId: number) => {
    if (handedOff.current?.requestId !== requestId) handedOff.current = { requestId, token: `search-ai-${requestId}-${Date.now()}` };
    return handedOff.current.token;
  };
  useEffect(() => {
    if (!aiNotebookId || answer?.status !== "done" || !answer.text || savedConversation.current?.requestId === answer.requestId || reasked.current === answer.requestId) return;
    if (onCommand) {
      savedConversation.current = { requestId: answer.requestId, id: "" };
      void onCommand({
        type: "archive-ai", token: tokenFor(answer.requestId), notebookId: aiNotebookId,
        question: answer.question, text: answer.text,
        sources: visibleSources(answer).map(({ index, source }) => ({ index, id: source.id, title: source.title })),
      });
      return;
    }
    savedConversation.current = { requestId: answer.requestId, id: saveSheetConversation(aiNotebookId, answer) };
  }, [onCommand, aiNotebookId, answer]);

  const askAi = () => {
    const question = (getQuestion?.() || aiQuery).trim();
    if (!question) return;
    const latestScope = useSearchSession.getState().scope;
    const candidates = getCandidates();
    if (latestScope.kind === "all") {
      const notebookIds = [...new Set(candidates.map(page => page.workspaceId))];
      const label = `所有笔记本（${notebookIds.map(id => notebookNames[id] ?? id).join("、")}）`;
      void ask(question, candidates, ranked, { notebookId: aiNotebookId ?? notebookIds[0] ?? "", notebookIds, label });
      return;
    }
    const notebookId = latestScope.notebookId ?? aiNotebookId ?? "";
    void ask(question, candidates, ranked, { notebookId, label: notebookNames[notebookId] ?? notebookId });
  };
  const continueInPanel = aiNotebookId && answer ? () => {
    skipRestoreRef.current = true;
    if (onCommand) {
      const token = tokenFor(answer.requestId);
      const sources = visibleSources(answer).map(({ index, source }) => ({ index, id: source.id, title: source.title }));
      if (answer.status !== "done") reasked.current = answer.requestId;
      void onCommand(answer.status === "done"
        ? { type: "continue-ai", token, notebookId: aiNotebookId, question: answer.question, text: answer.text, sources }
        : { type: "ask-ai", notebookId: aiNotebookId, question: answer.question });
      return;
    }
    useSearchSession.getState().closeSearch();
    const saved = savedConversation.current;
    if (saved?.requestId === answer.requestId) openSheetConversation(aiNotebookId, saved.id);
    else askNotebookAi({ notebookId: aiNotebookId, text: answer.question });
  } : undefined;
  const openSource = (id: string) => {
    returnFocusRef.current = null;
    if (onOpenResult) {
      const page = usePages.getState().pages[id];
      onOpenResult({ id, ...(page?.localFilePath ? { localFilePath: page.localFilePath } : {}) });
      return;
    }
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
