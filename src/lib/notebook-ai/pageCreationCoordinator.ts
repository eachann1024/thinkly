import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { useTabs } from "@/stores/useTabs";
import { guardNotebookForAiWrite } from "@/lib/notebook-ai/pageWriteGuard";
import type { JSONContent } from "@/types";

export type AiPageCreationResult =
  | { ok: true; pageId: string }
  | { ok: false; error: string };

interface AiPageCreationRequest {
  toolCallId: string;
  notebookId: string;
  title: string;
  content: JSONContent;
}

interface AiPageCreationOperation {
  notebookId: string;
  promise: Promise<AiPageCreationResult>;
}

const operations = new Map<string, AiPageCreationOperation>();

async function createPage(
  request: AiPageCreationRequest,
): Promise<AiPageCreationResult> {
  const notebookGuard = guardNotebookForAiWrite(request.notebookId);
  if (!notebookGuard.ok) return notebookGuard;

  try {
    const notebook = useNotebooks.getState().notebooks[request.notebookId]!;
    let pageId: string | null;

    if (notebook.source === "local-folder") {
      pageId = await usePages.getState().createLocalPageRecord({
        workspaceId: request.notebookId,
        title: request.title,
        content: request.content,
      });
    } else {
      pageId = usePages.getState().createPageRecord({
        workspaceId: request.notebookId,
        content: request.content,
      });
    }

    if (!pageId) {
      return { ok: false, error: "创建页面失败，内容未保存" };
    }

    try {
      useTabs.getState().openTab(pageId);
    } catch (error) {
      console.error("[notebook-ai] open created page failed", error);
    }
    try {
      useNotebooks.getState().setLastActivePage(request.notebookId, pageId);
    } catch (error) {
      console.error("[notebook-ai] remember created page failed", error);
    }
    return { ok: true, pageId };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error && error.message
          ? error.message
          : "创建页面失败，内容未保存",
    };
  }
}

export function getOrCreateAiPage(
  request: AiPageCreationRequest,
): Promise<AiPageCreationResult> {
  if (!request.toolCallId) {
    return Promise.resolve({ ok: false, error: "缺少 AI 工具调用编号" });
  }

  const existing = operations.get(request.toolCallId);
  if (existing) {
    if (existing.notebookId !== request.notebookId) {
      return Promise.resolve({
        ok: false,
        error: "AI 工具调用与目标笔记本不一致，已取消创建",
      });
    }
    return existing.promise;
  }

  const operation: AiPageCreationOperation = {
    notebookId: request.notebookId,
    promise: Promise.resolve().then(() => createPage(request)),
  };
  operations.set(request.toolCallId, operation);
  void operation.promise.then(
    (result) => {
      if (!result.ok && operations.get(request.toolCallId) === operation) {
        operations.delete(request.toolCallId);
      }
    },
    () => {
      if (operations.get(request.toolCallId) === operation) {
        operations.delete(request.toolCallId);
      }
    },
  );
  return operation.promise;
}
