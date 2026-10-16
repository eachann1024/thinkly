export const REFINE_PLAN_EVENT = "goose-note:refine-ai-plan";
export type RefinePlanRequest = { notebookId: string; text: string };
export function requestPlanRefinement(request: RefinePlanRequest): void {
  window.dispatchEvent(
    new CustomEvent<RefinePlanRequest>(REFINE_PLAN_EVENT, { detail: request }),
  );
}

// 面板尚未挂载时暂存，输入框挂载后再写入。
let pendingRequest: RefinePlanRequest | null = null;
export function askNotebookAi(request: RefinePlanRequest): void {
  pendingRequest = request;
  window.dispatchEvent(new CustomEvent("goose-note:open-ai-panel"));
  requestPlanRefinement(request);
}
export function takePendingRefinement(notebookId: string, request?: RefinePlanRequest): RefinePlanRequest | null {
  const pending = pendingRequest;
  if (!pending || pending.notebookId !== notebookId || (request && request !== pending)) return null;
  pendingRequest = null;
  return pending;
}
