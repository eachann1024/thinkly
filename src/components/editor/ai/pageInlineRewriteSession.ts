import type { PrivateInlineTarget } from "@/lib/notebook-ai/inlineMarkdownApplySelection";
import type { InlineMenuState } from "./inlineRewriteSession";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/ai/pageInlineRewriteSession.ts#messages:1">`
zh-Hans:
  aiDidNotReturnAnyContentThatCould: "AI 未返回可写入的内容。"
  generatingWithPrefix: "{{prefix}}正在生成建议"
en:
  aiDidNotReturnAnyContentThatCould: "AI did not return any content that could be inserted."
  generatingWithPrefix: "{{prefix}}Generating suggestions"
ja:
  aiDidNotReturnAnyContentThatCould: "AI が書き込める内容を返しませんでした。"
  generatingWithPrefix: "{{prefix}}提案を生成しています"
`;
const t = createTranslator(messages);


export type PageInlineState = InlineMenuState;
export type RewritePart = (markdown: string, prompt: string, signal: AbortSignal, update: (text: string) => void) => Promise<string>;

/** Only in-memory text and snapshots. A session never owns an editor or its lifecycle. */
export function createPageInlineRewriteSession(pageId: string) {
  let state: PageInlineState = "closed";
  let target: PrivateInlineTarget | undefined;
  let drafts: string[] = [];
  let lastRequestSource: string[] | undefined;
  let generation = 0;
  let controller: AbortController | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: PageInlineState) => {
    state = next;
    for (const listener of listeners) listener();
  };
  const cancel = () => { generation++; controller?.abort(); controller = undefined; };
  const requestSource = (retry: boolean) => retry && lastRequestSource
    ? lastRequestSource
    : target?.parts.map((part, index) => drafts[index] ?? part.oldMarkdown) ?? [];
  const close = () => {
    cancel(); target = undefined; drafts = []; lastRequestSource = undefined;
    publish("closed");
  };
  return {
    pageId,
    get state() { return state; },
    get target() { return target; },
    get drafts() { return drafts; },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    open(next: PrivateInlineTarget) {
      cancel();
      target = next;
      drafts = [];
      lastRequestSource = undefined;
      publish({ blockId: next.sourceBlockIds[0], status: "user-input", prompt: "", draft: "", ticker: "" });
    },
    close,
    setInput(input: string) {
      if (state !== "closed") publish({ ...state, input });
    },
    stop() {
      cancel();
      if (state !== "closed") publish({
        ...state,
        status: drafts.length ? "user-reviewing" : "user-input",
        input: state.prompt,
        ticker: "", draft: drafts.join("\n\n"), error: undefined,
      });
    },
    fail(error: unknown, blockId?: string, request?: { prompt: string; retry: boolean }) {
      cancel();
      if (request) lastRequestSource = requestSource(request.retry);
      publish({ blockId: blockId ?? (state === "closed" ? "" : state.blockId),
        prompt: request?.prompt ?? (state === "closed" ? "" : state.prompt),
        input: request?.prompt ?? (state === "closed" ? "" : state.input || state.prompt),
        draft: "", ticker: "", status: "error", error });
    },
    async submit(prompt: string, rewrite: RewritePart, retry = false) {
      if (!target || state === "closed" || state.status === "thinking" || !prompt.trim()) return;
      cancel();
      const request = generation;
      const captured = target;
      // 追加要求基于上一版完整建议；重试复用同一次请求的输入，避免重复缩短等操作。
      const source = requestSource(retry);
      lastRequestSource = source;
      const abort = new AbortController();
      controller = abort;
      const pending = { blockId: captured.sourceBlockIds[0], prompt, input: "", draft: "", ticker: "", error: undefined };
      const owns = () => generation === request && !abort.signal.aborted && target === captured;
      publish({ ...pending, status: "thinking" });
      try {
        const results: string[] = [];
        for (let index = 0; index < captured.parts.length; index++) {
          if (!owns()) return;
          const prefix = captured.parts.length > 1 ? `${index + 1}/${captured.parts.length} · ` : "";
          publish({ ...pending, status: "thinking", ticker: t("generatingWithPrefix", { prefix }) });
          const result = await rewrite(source[index], prompt, abort.signal, (ticker) => {
            if (owns()) publish({ ...pending, status: "thinking", ticker: prefix + ticker });
          });
          if (!owns()) return;
          if (!result.trim()) throw new Error(t("aiDidNotReturnAnyContentThatCould"));
          results.push(result);
        }
        if (!owns()) return;
        drafts = results;
        publish({ ...pending, status: "user-reviewing", draft: results.join("\n\n") });
      } catch (error) {
        if (owns()) publish({ ...pending, input: prompt, status: "error", error });
      } finally {
        if (controller === abort) controller = undefined;
      }
    },
  };
}
export type PageInlineRewriteSession = ReturnType<typeof createPageInlineRewriteSession>;
const sessions = new Map<string, PageInlineRewriteSession>();
export function getPageInlineRewriteSession(pageId: string): PageInlineRewriteSession {
  let session = sessions.get(pageId);
  if (!session) {
    session = createPageInlineRewriteSession(pageId);
    sessions.set(pageId, session);
  }
  return session;
}
