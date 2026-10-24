import { getLocationSnapshot } from "@/components/editor/ai/composer/referenceMetadata";
import { readDbStorageJSON, writeDbStorageJSON } from "@/lib/storage";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";

export interface ResourceRef {
  refId: string;
  notebookId: string;
  kind: "notebook" | "folder" | "page";
  pageId?: string;
  parentId?: string | null;
  title: string;
  relativePath: string;
  role?: "source" | "target";
  recursive?: boolean;
  excludedPageIds?: string[];
}
export interface RunWriteScope {
  version: 1;
  runId: string;
  sourceReferences: ResourceRef[];
  targetReferences: ResourceRef[];
  writablePageIds: string[];
  revoked?: boolean;
  notebookRoots?: Record<string, string | null>;
}
export interface OperationTarget {
  notebookId: string;
  parentId?: string | null;
  pageId?: string;
}
interface ScopedOperation {
  type: "create" | "edit" | "search_replace" | "delete";
  target?: OperationTarget;
  parentId?: string | null;
  pageId?: string;
  pageIds?: string[];
}
const revokedRuns = new Set<string>();
export function revokeRunWriteScope(runId: string) {
  revokedRuns.add(runId);
  writeDbStorageJSON(`gn:ai-write-revoked:${runId}`, true);
}
export function isRunWriteScopeRevoked(scope: RunWriteScope) {
  return Boolean(scope.revoked || revokedRuns.has(scope.runId) ||
    readDbStorageJSON<boolean>(`gn:ai-write-revoked:${scope.runId}`, false));
}
export function createRunWriteScope(params: {
  runId: string;
  sourceReferences: ResourceRef[];
  targetReferences: ResourceRef[];
  writablePageIds?: string[];
}): RunWriteScope {
  const copy = (refs: ResourceRef[]) => refs.map((ref) => ({ ...ref,
    excludedPageIds: ref.excludedPageIds ? [...ref.excludedPageIds] : undefined }));
  return {
    version: 1, runId: params.runId,
    notebookRoots: Object.fromEntries(params.targetReferences.map((ref) => [ref.notebookId,
      useNotebooks.getState().notebooks[ref.notebookId]?.localPath ?? null])),
    sourceReferences: copy(params.sourceReferences),
    targetReferences: copy(params.targetReferences),
    writablePageIds: [...new Set(params.writablePageIds ?? params.targetReferences
      .flatMap((ref) => ref.kind === "page" && ref.pageId ? [ref.pageId] : []))],
  };
}

/** Resolve only stable identities. Never infer ownership from names or the active tab. */
export function resolveOperationTarget(
  operation: ScopedOperation,
  fallbackNotebookId: string,
  scope?: RunWriteScope,
): OperationTarget {
  const target = operation.target;
  if (target) {
    if (!target.notebookId) throw new Error("操作缺少目标笔记本");
    if (operation.type === "create" && target.parentId === undefined)
      throw new Error("显式新建目标缺少 parentId；笔记本根必须明确使用 null");
    if (target.pageId && operation.type === "create") throw new Error("新建操作必须绑定目录或笔记本根");
    if (target.pageId && operation.type === "delete" && !operation.pageIds?.includes(target.pageId))
      throw new Error("删除目标与页面 ID 冲突");
    if (target.pageId && operation.pageId && target.pageId !== operation.pageId)
      throw new Error("操作目标与页面 ID 冲突");
    if (target.parentId !== undefined && operation.parentId !== undefined &&
        target.parentId !== operation.parentId) throw new Error("操作目标与父级 ID 冲突");
    return { ...target, ...(operation.type === "create" ? {
      parentId: target.parentId ?? operation.parentId ?? null,
    } : {}) };
  }
  if (!scope) return { notebookId: fallbackNotebookId,
    ...(operation.type === "create" ? { parentId: operation.parentId ?? null } : {}),
    ...(operation.pageId ? { pageId: operation.pageId } : {}) };
  const candidates = scope.targetReferences.filter((ref) => {
    if (operation.type === "create") return ref.kind !== "page" &&
      (operation.parentId === undefined || (ref.pageId ?? null) === operation.parentId);
    const ids = operation.pageIds ?? (operation.pageId ? [operation.pageId] : []);
    return ref.kind === "page" && !!ref.pageId && ids.includes(ref.pageId);
  });
  const unique = [...new Map(candidates.map((ref) => [
    `${ref.notebookId}:${ref.pageId ?? "root"}`, ref,
  ])).values()];
  if (unique.length !== 1) throw new Error("写入目的地不明确，请先指定笔记本和目录");
  const ref = unique[0]!;
  return { notebookId: ref.notebookId,
    ...(operation.type === "create" ? { parentId: ref.pageId ?? null } : {}),
    ...(operation.pageId ? { pageId: operation.pageId } : {}) };
}

export function checkOperationScope(
  operation: ScopedOperation,
  target: OperationTarget,
  scope?: RunWriteScope,
  legacyNotebookId?: string,
): string | null {
  if (!useNotebooks.getState().notebooks[target.notebookId]) return "目标笔记本不存在或已卸载";
  if (!scope) return legacyNotebookId === target.notebookId ? null : "跨笔记本写入缺少本轮授权范围";
  if (isRunWriteScopeRevoked(scope)) return "本轮写入范围已撤销";
  if (scope.notebookRoots && scope.notebookRoots[target.notebookId] !==
      (useNotebooks.getState().notebooks[target.notebookId]?.localPath ?? null))
    return "本轮目标笔记本位置已变化，请重新选择";
  const refs = scope.targetReferences.filter((ref) => ref.notebookId === target.notebookId);
  if (operation.type === "create") {
    const parentId = target.parentId ?? null;
    const allowed = refs.some((ref) => parentId === null
      ? ref.kind === "notebook"
      : ref.kind === "folder" && ref.pageId === parentId);
    if (!allowed) return "新建目标不在本轮授权目录内";
    if (parentId) {
      const parent = usePages.getState().pages[parentId];
      if (!parent || parent.workspaceId !== target.notebookId || !parent.isFolder || parent.trashedAt)
        return "新建目标目录不存在、已删除或归属发生变化";
      const ref = refs.find((candidate) => candidate.kind === "folder" && candidate.pageId === parentId)!;
      if ((ref.parentId !== undefined && ref.parentId !== (parent.parentId ?? null)) ||
          (ref.relativePath && ref.relativePath !== getLocationSnapshot(parent,
            useNotebooks.getState().notebooks, usePages.getState().pages)))
        return "本轮目标目录位置已变化，请重新选择";
    }
    return null;
  }
  const pageIds = operation.pageIds ?? (operation.pageId ? [operation.pageId] : []);
  if (!pageIds.length) return "操作缺少目标页面";
  for (const id of pageIds) {
    const page = usePages.getState().pages[id];
    if (!page || page.workspaceId !== target.notebookId) return "目标页面与笔记本归属不一致";
    const ref = refs.find((candidate) => candidate.kind === "page" && candidate.pageId === id);
    if (ref && ((ref.parentId !== undefined && ref.parentId !== (page.parentId ?? null)) ||
        (page.localFilePath && ref.relativePath && ref.relativePath !== getLocationSnapshot(page,
          useNotebooks.getState().notebooks, usePages.getState().pages))))
      return "本轮目标页面位置已变化，请重新选择";
    if (!refs.some((ref) => ref.kind === "page" && ref.pageId === id) || !scope.writablePageIds.includes(id))
      return "目标页面未获得本轮修改或删除授权；来源引用只读";
  }
  return null;
}
