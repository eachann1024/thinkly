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

/** Only the user's own request and explicit target chips can authorize locations. */
export function selectRunWriteTargets(params: {
  prompt: string;
  references: ResourceRef[];
  fallbackRoot: ResourceRef;
  currentPage?: ResourceRef;
}): ResourceRef[] {
  const { prompt, references } = params;
  const explicit = references.filter((ref) => ref.role === "target");
  if (explicit.length) return explicit.map((ref) => ({ ...ref }));
  const sources = references.filter((ref) => ref.role !== "target");
  const create = /新建|创建|另存|保存|写入|写回|(?:生成|写|起草).{0,20}(?:笔记|文件|\.?md\b)|(?:create|save|write)\b|(?:generate|draft).{0,24}(?:note|file|markdown)/i.test(prompt) &&
    !/(?:不要|禁止|不许|无需|不用|不必|不).{0,5}(?:新建|创建|另存|保存|写入|写回|生成|起草)|(?:do not|never).{0,8}(?:create|save|write|generate|draft)/i.test(prompt);
  const modify = /修改|改写|重写|润色|替换|重命名|追加|补充|删除|移入垃圾箱|(?:edit|update|rewrite|replace|rename|append|delete)\b/i.test(prompt);
  const each = /分别|各自|每个|每一|逐个|逐一|(?:each|every|respective)\b/i.test(prompt);
  const writeBack = /写回|保存回|存回|原目录|对应目录|各自目录|各文件夹|each.{0,24}(?:folder|directory)/i.test(prompt);
  const singleOutput = /(?:汇总|合并|综合|整合).{0,12}(?:一篇|一份|一个)|(?:single|one).{0,12}(?:note|file)/i.test(prompt);
  if (create && (sources.length === 1 || each || (writeBack && !singleOutput))) {
    return sources.map((ref) => {
      if (ref.kind !== "page") return { ...ref, role: "target" as const };
      const pages = usePages.getState().pages;
      const parent = ref.parentId ? pages[ref.parentId] : undefined;
      return {
        ...ref, kind: parent ? "folder" as const : "notebook" as const,
        refId: `${ref.notebookId}:write-parent:${ref.parentId ?? "root"}`,
        pageId: parent?.id, parentId: parent?.parentId ?? null,
        title: parent ? getPageTitle(parent) : useNotebooks.getState().notebooks[ref.notebookId]?.name ?? ref.notebookId,
        relativePath: parent ? getLocationSnapshot(parent, useNotebooks.getState().notebooks, pages) : "/",
        role: "target" as const,
      };
    });
  }
  if (modify && !create) {
    return (sources.length ? sources : params.currentPage ? [params.currentPage] : [])
      .filter((ref) => ref.kind === "page")
      .map((ref) => ({ ...ref, role: "target" as const }));
  }
  return create && sources.length === 0 ? [{ ...params.fallbackRoot, role: "target" }] : [];
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
    targetReferences: selectRunWriteTargets({ prompt: params.prompt, references, fallbackRoot: root, currentPage }),
  });
}

/** Chip labels, attachment names and skill names are data, never write authorization. */
export function freezeNotebookAiComposerRun(params: {
  notebookId: string;
  currentPageId?: string | null;
  payload: Pick<AiComposerPayload, "freeformText">;
  references?: ResourceRef[];
}): RunWriteScope {
  return freezeNotebookAiRun({ ...params, prompt: params.payload.freeformText });
}

/** Never recover authority from assistant text, skill instructions, or note contents. */
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
  return ["本轮冻结写入范围（位置数据，来源不授予写入）：", JSON.stringify(scope),
    scope.targetReferences.length ? "每项操作必须绑定 target.notebookId；新建还需 target.parentId（根目录为 null）。只在这些目标内执行；修改、查找替换和删除仍需审批。" :
      "本轮没有确定的写入目的地。若用户要保存产物，集中询问一次保存到哪个笔记本和目录，请点击文件夹图标，在“写入位置”中选择目的地；等待下一轮用户答复，不能回退当前本。"].join("\n");
}
