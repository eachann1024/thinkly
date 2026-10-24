import type { ToolUIPart } from "ai";
import type { LiveWriterContext } from "./types";
import { usePages } from "@/stores/usePages";
import { guardPageForAiWrite } from "./pageWriteGuard";
import {
  sessions,
  stoppedToolCalls,
  THROTTLE_MS,
  tryExtractFromPartialJson,
  ensurePageCreated,
  writeIntermediateFrame,
  writeFinalFrame,
  reloadEditorIfActive,
  cleanupWriterSession,
} from "./liveWriterSession";
export {
  reloadEditorIfActive,
  createAndFinalizePage,
  cleanupWriterSession,
} from "./liveWriterSession";

export type StreamingWritePart = ToolUIPart & {
  type: "tool-createPage" | "tool-updatePage";
};

export async function handleStreamingWritePart(
  part: StreamingWritePart,
  ctx: LiveWriterContext,
): Promise<void> {
  const partData = part as unknown as {
    toolCallId: string;
    state: string;
    input?: unknown;
    output?: unknown;
  };
  const { toolCallId, state, input, output } = partData;
  const isCreatePage = part.type === "tool-createPage";

  if (stoppedToolCalls.has(toolCallId)) return;

  if (state.includes("error") || state.includes("denied")) {
    cleanupWriterSession(toolCallId);
    return;
  }

  if (state === "input-streaming") {
    const { title, markdown } = tryExtractFromPartialJson(input);

    if (!title) return;

    if (isCreatePage && !sessions.has(toolCallId)) {
      if (markdown === undefined) return;
      await ensurePageCreated(title, ctx.notebookId, toolCallId);
    }

    const session = sessions.get(toolCallId);
    if (!session) return;

    const frameGuard = guardPageForAiWrite(session.pageId, {
      expectedNotebookId: session.notebookId,
    });
    if (!frameGuard.ok) {
      cleanupWriterSession(toolCallId);
      return;
    }

    if (!isCreatePage && markdown === undefined) return;
    session.lastMarkdown = markdown ?? "";

    const now = Date.now();
    if (now - session.lastScheduled < THROTTLE_MS) {
      return;
    }

    session.lastScheduled = now;
    if (session.throttleTimer) {
      clearTimeout(session.throttleTimer);
    }
    session.throttleTimer = setTimeout(() => {
      const s = sessions.get(toolCallId);
      if (!s) return;
      if (!writeIntermediateFrame(s)) {
        cleanupWriterSession(toolCallId);
        return;
      }
      s.throttleTimer = null;
    }, THROTTLE_MS);
  } else if (state === "output-available") {
    const session = sessions.get(toolCallId);
    if (isCreatePage && !session) return;
    if (session?.throttleTimer) {
      clearTimeout(session.throttleTimer);
      session.throttleTimer = null;
    }

    try {
      const { title: inputTitle, markdown: inputMarkdown } =
        tryExtractFromPartialJson(input);

      if (isCreatePage) {
        const pageId = session?.pageId ?? null;
        if (!pageId) return;

        const md = inputMarkdown ?? "";
        const title = inputTitle ?? session?.title ?? "";
        if (session) await writeFinalFrame(md, title, session);
      } else {
        const pageId =
          input && typeof input === "object"
            ? ((input as Record<string, unknown>).pageId as string | undefined)
            : undefined;
        const targetPageId =
          pageId ?? ctx.currentPageId ?? usePages.getState().activePageId;
        if (!targetPageId) return;
        const result =
          output && typeof output === "object"
            ? (output as Record<string, unknown>)
            : null;
        if (result?.ok === true) reloadEditorIfActive(targetPageId);
      }
    } finally {
      cleanupWriterSession(toolCallId);
    }
  }
}
