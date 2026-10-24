
import { usePages } from "@/stores/usePages";
import { useTabs } from "@/stores/useTabs";
import { buildAiPageContent } from "@/lib/notebook-ai/markdown";
import {
  getOrCreateAiPage,
  type AiPageCreationResult,
} from "@/lib/notebook-ai/pageCreationCoordinator";
import {
  guardPageForAiWrite,
  writePageContentSafely,
} from "@/lib/notebook-ai/pageWriteGuard";
import type { JSONContent } from "@/types";

export interface WriterSession {
  pageId: string;
  notebookId: string;
  title: string;
  lastScheduled: number;
  throttleTimer: ReturnType<typeof setTimeout> | null;
  lastMarkdown: string;
  follow: boolean;
  wheelCleanup: (() => void) | null;
}

export const sessions = new Map<string, WriterSession>();
export const stoppedToolCalls = new Set<string>();

export const THROTTLE_MS = 200;


export function tryExtractFromPartialJson(partialInput: unknown): {
  title?: string;
  markdown?: string;
} {
  if (!partialInput || typeof partialInput !== "object") return {};
  const obj = partialInput as Record<string, unknown>;
  return {
    title: typeof obj.title === "string" ? obj.title : undefined,
    markdown: typeof obj.markdown === "string" ? obj.markdown : undefined,
  };
}

function getActivePageId(): string | null {
  const { openTabs, activeTabId } = useTabs.getState();
  if (!activeTabId) return null;
  const tab = openTabs.find((t) => t.id === activeTabId);
  return tab?.pageId ?? null;
}

function followScroll(session: WriterSession) {
  if (!session.follow) return;
  if (getActivePageId() !== session.pageId) return;
  if (typeof window === "undefined") return;

  const scroll = () => {
    if (!session.follow) return;
    if (getActivePageId() !== session.pageId) return;
    const container = document.querySelector(
      ".page-scroll-container",
    ) as HTMLElement | null;
    if (!container) return;
    if (container.scrollHeight <= container.clientHeight) return;
    container.scrollTop = container.scrollHeight;
  };

  scroll();
  requestAnimationFrame(scroll);
  setTimeout(scroll, 80);
  setTimeout(scroll, 400);
}

export function reloadEditorIfActive(pageId: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("goose-note:reload-active-editor", {
        detail: { pageId },
      }),
    );
  }
}

export function writeIntermediateFrame(session: WriterSession): boolean {
  const guard = guardPageForAiWrite(session.pageId, {
    expectedNotebookId: session.notebookId,
  });
  if (!guard.ok) return false;

  try {
    const content = buildAiPageContent(session.title, session.lastMarkdown);
    usePages
      .getState()
      .updatePage(
        session.pageId,
        { content: content as JSONContent },
        { silent: true },
      );
    reloadEditorIfActive(session.pageId);
    followScroll(session);
    return true;
  } catch {
    return true;
  }
}

export async function writeFinalFrame(
  markdown: string,
  title: string,
  session: WriterSession,
): Promise<boolean> {
  try {
    const content = buildAiPageContent(title, markdown);
    const result = await writePageContentSafely(
      session.pageId,
      content as JSONContent,
      { expectedNotebookId: session.notebookId },
    );
    if (!result.ok) {
      console.error("[liveWriter] writeFinalFrame refused", result.error);
      return false;
    }
    reloadEditorIfActive(session.pageId);
    followScroll(session);
    return true;
  } catch (err) {
    console.error("[liveWriter] writeFinalFrame failed", err);
    return false;
  }
}

export async function ensurePageCreated(
  title: string,
  notebookId: string,
  toolCallId: string,
  initialMarkdown = "",
  retryFailedCreation = false,
): Promise<AiPageCreationResult> {
  if (stoppedToolCalls.has(toolCallId)) {
    return { ok: false, error: "本轮 AI 写入已结束" };
  }
  const existing = sessions.get(toolCallId);
  if (existing) return { ok: true, pageId: existing.pageId };

  const request = {
    toolCallId,
    notebookId,
    title,
    content: buildAiPageContent(title, initialMarkdown) as JSONContent,
  };
  let creation = await getOrCreateAiPage(request);
  if (!creation.ok && retryFailedCreation) {
    creation = await getOrCreateAiPage(request);
  }
  if (!creation.ok || stoppedToolCalls.has(toolCallId)) return creation;

  const existingAfterCreate = sessions.get(toolCallId);
  if (existingAfterCreate) {
    return { ok: true, pageId: existingAfterCreate.pageId };
  }

  const pageGuard = guardPageForAiWrite(creation.pageId, {
    expectedNotebookId: notebookId,
  });
  if (!pageGuard.ok) return pageGuard;

  const session: WriterSession = {
    pageId: creation.pageId,
    notebookId,
    title,
    lastScheduled: 0,
    throttleTimer: null,
    lastMarkdown: initialMarkdown,
    follow: true,
    wheelCleanup: null,
  };
  sessions.set(toolCallId, session);

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const container = document.querySelector(".page-scroll-container");
    if (container) {
      const onWheel = (e: Event) => {
        const we = e as WheelEvent;
        if (we.deltaY < 0) {
          session.follow = false;
        } else {
          const el = container as HTMLElement;
          const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
          if (dist < 48) session.follow = true;
        }
      };
      container.addEventListener("wheel", onWheel, { passive: true });
      session.wheelCleanup = () =>
        container.removeEventListener("wheel", onWheel);
    }
  }

  return creation;
}

export async function createAndFinalizePage(params: {
  toolCallId: string;
  notebookId: string;
  title: string;
  markdown: string;
}): Promise<AiPageCreationResult> {
  const creation = await ensurePageCreated(
    params.title,
    params.notebookId,
    params.toolCallId,
    params.markdown,
    true,
  );
  if (!creation.ok) return creation;

  const session = sessions.get(params.toolCallId);
  if (!session) {
    return { ok: false, error: "AI 写入会话已结束" };
  }

  try {
    const written = await writeFinalFrame(
      params.markdown,
      params.title,
      session,
    );
    return written
      ? creation
      : { ok: false, error: "页面写入失败，内容未保存" };
  } finally {
    cleanupWriterSession(params.toolCallId);
  }
}


export function cleanupWriterSession(toolCallId: string): void {
  stoppedToolCalls.add(toolCallId);
  if (stoppedToolCalls.size > 200) {
    const oldest = stoppedToolCalls.values().next().value;
    if (oldest) stoppedToolCalls.delete(oldest);
  }
  const session = sessions.get(toolCallId);
  if (session?.throttleTimer) {
    clearTimeout(session.throttleTimer);
  }
  session?.wheelCleanup?.();
  sessions.delete(toolCallId);
}
