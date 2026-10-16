import type { AssetScan } from "../../src/lib/asset-maintenance-contract";
export type ScanRecord = { result: AssetScan; root: string; fingerprints: Map<string, string>; created: number };
export type AssetMaintenanceLifecycle =
  | { status: "idle" }
  | { status: "scanning"; operationId: number }
  | { status: "ready"; record: ScanRecord }
  | { status: "confirming"; operationId: number; record: ScanRecord }
  | { status: "trashing"; operationId: number }
  | { status: "closing-operation"; operationId: number };
export type AssetMaintenanceEvent =
  | { type: "scan"; operationId: number }
  | { type: "scanned"; operationId: number; record: ScanRecord }
  | { type: "confirm"; operationId: number }
  | { type: "consume" | "cancel" | "finish"; operationId: number }
  | { type: "close" };
export function assetMaintenanceTransition(state: AssetMaintenanceLifecycle, event: AssetMaintenanceEvent): AssetMaintenanceLifecycle {
  if (event.type === "close") return "operationId" in state ? { status: "closing-operation", operationId: state.operationId } : { status: "idle" };
  if (event.type === "scan") return state.status === "idle" || state.status === "ready" ? { status: "scanning", operationId: event.operationId } : state;
  if (event.type === "confirm") return state.status === "ready" ? { status: "confirming", operationId: event.operationId, record: state.record } : state;
  if (!("operationId" in state) || state.operationId !== event.operationId) return state;
  if (event.type === "scanned") return state.status === "scanning" ? { status: "ready", record: event.record } : state;
  if (event.type === "cancel") return state.status === "confirming" ? { status: "ready", record: state.record } : state;
  if (event.type === "consume") return state.status === "confirming" ? { status: "trashing", operationId: state.operationId } : state;
  return state.status === "confirming" ? { status: "ready", record: state.record } : { status: "idle" };
}
export const activeAssetScan = (state: AssetMaintenanceLifecycle) => state.status === "ready" || state.status === "confirming" ? state.record : null;
export const assetMaintenanceBusy = (state: AssetMaintenanceLifecycle) => "operationId" in state;
