import { getLocationSnapshot } from "@/components/editor/ai/composer/referenceMetadata";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { createRunWriteScope, type ResourceRef, type RunWriteScope } from "./resourceScope";
import type { NotebookAiMessage } from "./types";
import type { NotebookSkillId } from "./skillIds";
import type { AiComposerPayload } from "@/components/editor/ai/composer/referenceTypes";
import { collectLoadedSkillIds } from "./pi/messages";

export interface NotebookAiRunContext {
  writeScope?: RunWriteScope;
  resourceReferences?: ResourceRef[];
  loadedSkills?: NotebookSkillId[];
}

export function resolveRunCurrentPageId(value: string | null | undefined, fallback: () => string | null) {
  return value === undefined ? fallback() : value;
}

export function selectRunWriteTargets(params: {
  references: ResourceRef[];
  fallbackRoot: ResourceRef;
  currentPage?: ResourceRef;
}): ResourceRef[] {
  const { references } = params;
  const explicit = references.filter((ref) => ref.role === "target");
  if (explicit.length) return explicit.map((ref) => ({ ...ref }));
  const hints = references.length ? references : params.currentPage ? [params.currentPage] : [params.fallbackRoot];
  return hints.map((ref) => ({ ...ref }));
}

export function freezeNotebookAiRun(params: {
  notebookId: string;
  currentPageId?: string | null;
  prompt: string;
  references?: ResourceRef[];
}): RunWriteScope {
  const notebook = useNotebooks.getState().notebooks[params.notebookId];
  const page = params.currentPageId ? usePages.getState().pages[params.currentPageId] : undefined;
  const currentPage: ResourceRef | undefined = page && !page.trashedAt && page.workspaceId === params.notebookId ? {
    refId: `${page.workspaceId}:page:${page.id}`, notebookId: page.workspaceId,
    kind: "page", pageId: page.id, parentId: page.parentId ?? null,
    title: getPageTitle(page), relativePath: getLocationSnapshot(page, useNotebooks.getState().notebooks, usePages.getState().pages), role: "source",
  } : undefined;
  const references = params.references ?? [];
  const root: ResourceRef = { refId: `${params.notebookId}:notebook:root`, notebookId: params.notebookId,
    kind: "notebook", title: notebook?.name ?? params.notebookId, relativePath: "/" };
  return createRunWriteScope({
    runId: globalThis.crypto?.randomUUID?.() ?? `run-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sourceReferences: references.filter((ref) => ref.role !== "target"),
    targetReferences: selectRunWriteTargets({ references, fallbackRoot: root, currentPage }),
  });
}

export function freezeNotebookAiComposerRun(params: {
  notebookId: string;
  currentPageId?: string | null;
  payload: Pick<AiComposerPayload, "freeformText">;
  references?: ResourceRef[];
}): RunWriteScope {
  return freezeNotebookAiRun({ ...params, prompt: params.payload.freeformText });
}

export function getNotebookAiRunContext(messages: NotebookAiMessage[]): NotebookAiRunContext {
  const user = [...messages].reverse().find((message) => message.role === "user");
  const writeScope = user?.metadata?.writeScope;
  const references = user?.metadata?.resourceReferences;
  return {
    writeScope,
    resourceReferences: references?.length ? references : undefined,
    loadedSkills: collectLoadedSkillIds(messages),
  };
}

export function formatRunWriteScope(scope: RunWriteScope): string {
  return ["本轮位置快照与目标提示（位置数据，不是权限白名单）：", JSON.stringify(scope),
    "AI 可读取和按用户要求修改所有可访问笔记本、目录及页面；source/target 只表示用途，空目标或旧的 writablePageIds 不限制权限。每项操作绑定真实 target.notebookId；新建还需 target.parentId（根目录为 null）。修改、查找替换和删除仍需审批；目标不明确时询问位置，不得声称只读或要求重新发起任务。"].join("\n");
}
