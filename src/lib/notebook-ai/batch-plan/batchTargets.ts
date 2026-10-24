import { getPageTitle } from "@/components/editor/utils/page-title";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { checkOperationScope, resolveOperationTarget, type RunWriteScope } from "../resourceScope";
import type { BatchPlanInput, BatchPlanJournal, BatchPlanOperationInput, FrozenOperationTarget } from "./types";
import { assertLocalPathInsideRoot } from "./batchPaths";

export function operationNotebookId(journal: BatchPlanJournal, operation: BatchPlanOperationInput) {
  return journal.version === 1 ? journal.notebookId
    : journal.operationTargets?.[operation.operationId]?.notebookId ?? operation.target?.notebookId ?? journal.notebookId;
}
function locationSignature(notebookId: string, parentId?: string | null) {
  const pages = usePages.getState().pages;
  const parts: unknown[] = [];
  const seen = new Set<string>();
  let id = parentId;
  while (id) {
    if (seen.has(id)) throw new Error("目标目录存在循环父级");
    seen.add(id);
    const page = pages[id];
    if (!page || page.workspaceId !== notebookId || page.trashedAt)
      throw new Error("目标位置不存在或归属发生变化");
    parts.push([page.id, page.parentId ?? null, page.isFolder ? getPageTitle(page) : null, page.localFilePath ?? null]);
    id = page.parentId;
  }
  return JSON.stringify(parts);
}
export function bindOperationTargets(input: BatchPlanInput, notebookId: string, scope?: RunWriteScope) {
  const targets: Record<string, FrozenOperationTarget> = {};
  const operations = input.operations.map((operation) => {
    const target = resolveOperationTarget(operation, notebookId, scope);
    const error = checkOperationScope(operation, target, scope, notebookId);
    if (error) throw new Error(error);
    const notebook = useNotebooks.getState().notebooks[target.notebookId];
    const locationId = operation.type === "create" ? target.parentId
      : operation.type === "delete" ? undefined : operation.pageId;
    targets[operation.operationId] = { ...target, notebookRoot: notebook?.localPath,
      locationSignature: locationSignature(target.notebookId, locationId) };
    return { ...operation, target,
      ...(operation.type === "create" ? { parentId: target.parentId ?? null } : {}) } as BatchPlanOperationInput;
  });
  return { input: { ...input, operations }, targets };
}

export async function validateFrozenOperationTarget(journal: BatchPlanJournal, operation: BatchPlanOperationInput) {
  if (journal.version === 1) return null;
  const target = journal.operationTargets?.[operation.operationId];
  if (!target) return "冻结计划缺少操作目标";
  const error = checkOperationScope(operation, target, journal.writeScope, journal.notebookId);
  if (error) return error;
  const notebook = useNotebooks.getState().notebooks[target.notebookId];
  if (notebook?.localPath !== target.notebookRoot) return "目标笔记本位置在审批后发生变化";
  try {
    const id = operation.type === "create" ? target.parentId
      : operation.type === "delete" ? undefined : operation.pageId;
    if (locationSignature(target.notebookId, id) !== target.locationSignature)
      return "目标位置在审批后发生变化，请重新绑定";
    if (notebook?.source === "local-folder") {
      if (!notebook.localPath) return "本地笔记本根目录不可用";
      const planned = journal.plannedLocalPaths[operation.operationId];
      if (planned) await assertLocalPathInsideRoot(planned, notebook.localPath, { targetMayNotExist: true });
      const ids = operation.type === "delete" ? operation.pageIds
        : operation.type === "create" ? [] : [operation.pageId];
      for (const pageId of ids) {
        const path = usePages.getState().pages[pageId]?.localFilePath;
        if (!path) return "本地目标文件路径不可用";
        await assertLocalPathInsideRoot(path, notebook.localPath);
      }
    }
  } catch (error) { return error instanceof Error ? error.message : "目标位置校验失败"; }
  return null;
}
