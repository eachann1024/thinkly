import type { AssetNotebook, AssetScan } from "./asset-maintenance-contract";

type Workspace = { notebooks: AssetNotebook[]; notebookId: string };
type ScanSelection = { scan: AssetScan; selected: Set<string>; previewPath: string | null };
export type AssetMaintenanceState = Workspace & (
  | { status: "loading" | "scanning"; requestId: number }
  | { status: "idle" }
  | ({ status: "ready" } & ScanSelection)
  | ({ status: "trashing"; requestId: number } & ScanSelection)
  | { status: "error"; error: string }
  | { status: "success"; message: string }
);
export type AssetMaintenanceEvent =
  | { type: "load"; requestId: number }
  | { type: "loaded"; requestId: number; notebooks: AssetNotebook[] }
  | { type: "select-notebook"; notebookId: string }
  | { type: "scan"; requestId: number }
  | { type: "scanned"; requestId: number; scan: AssetScan }
  | { type: "trash"; requestId: number }
  | { type: "trashed"; requestId: number; deleted: number; canceled: boolean }
  | { type: "failed"; requestId: number; error: string }
  | { type: "toggle"; path: string; preview: boolean }
  | { type: "select-all"; selected: boolean };
export function assetMaintenanceReducer(state: AssetMaintenanceState, event: AssetMaintenanceEvent): AssetMaintenanceState {
  const workspace = { notebooks: state.notebooks, notebookId: state.notebookId };
  if (event.type === "load") return { status: "loading", requestId: event.requestId, notebooks: state.notebooks, notebookId: "" };
  if (event.type === "loaded") return state.status === "loading" && state.requestId === event.requestId
    ? { ...workspace, status: "idle", notebooks: event.notebooks } : state;
  if (event.type === "select-notebook") return ["loading", "scanning", "trashing"].includes(state.status) ? state
    : { ...workspace, status: "idle", notebookId: event.notebookId };
  if (event.type === "scan") return !state.notebookId || ["loading", "scanning", "trashing"].includes(state.status) ? state
    : { ...workspace, status: "scanning", requestId: event.requestId };
  if (event.type === "scanned") return state.status === "scanning" && state.requestId === event.requestId && event.scan.notebook.id === state.notebookId
    ? { ...workspace, status: "ready", scan: event.scan, selected: new Set(), previewPath: null } : state;
  if (event.type === "failed") return "requestId" in state && state.requestId === event.requestId
    ? { ...workspace, status: "error", error: event.error } : state;
  if (event.type === "trash") return state.status === "ready" && state.selected.size
    ? { ...state, status: "trashing", requestId: event.requestId } : state;
  if (event.type === "trashed") {
    if (state.status !== "trashing" || state.requestId !== event.requestId) return state;
    return event.canceled ? { ...workspace, status: "ready", scan: state.scan, selected: state.selected, previewPath: state.previewPath }
      : { ...workspace, status: "success", message: `已将 ${event.deleted} 个文件移入废纸篓。继续清理请重新扫描。` };
  }
  if (state.status !== "ready") return state;
  if (event.type === "select-all") return { ...state, selected: event.selected ? new Set(state.scan.assets.map(asset => asset.path)) : new Set() };
  if (!state.scan.assets.some(asset => asset.path === event.path)) return state;
  const selected = new Set(state.selected);
  if (selected.has(event.path)) selected.delete(event.path); else selected.add(event.path);
  return { ...state, selected, previewPath: event.preview ? event.path : state.previewPath };
}
