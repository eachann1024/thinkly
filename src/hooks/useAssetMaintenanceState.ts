import { useCallback, useEffect, useReducer, useRef } from "react";
import type { AssetMaintenanceBridge } from "@/lib/asset-maintenance-contract";
import { assetMaintenanceReducer, type AssetMaintenanceEvent, type AssetMaintenanceState } from "@/lib/asset-maintenance-state";

const INITIAL_STATE: AssetMaintenanceState = { status: "loading", requestId: 0, notebooks: [], notebookId: "" };
const NO_SELECTION = new Set<string>();
export function useAssetMaintenanceState(bridge: AssetMaintenanceBridge) {
  const [state, dispatch] = useReducer(assetMaintenanceReducer, INITIAL_STATE);
  const current = useRef(state);
  const sequence = useRef(0);
  const active = useRef(true);
  const locked = useRef(false);
  const send = useCallback((event: AssetMaintenanceEvent) => {
    if (!active.current) return;
    current.current = assetMaintenanceReducer(current.current, event);
    dispatch(event);
  }, []);
  const loadNotebooks = useCallback(async () => {
    if (locked.current) return;
    locked.current = true;
    const requestId = ++sequence.current;
    send({ type: "load", requestId });
    try { send({ type: "loaded", requestId, notebooks: await bridge.notebooks() }); }
    catch (error) { send({ type: "failed", requestId, error: String(error) }); }
    finally { locked.current = false; }
  }, [bridge, send]);
  useEffect(() => {
    active.current = true;
    void loadNotebooks();
    return () => { active.current = false; };
  }, [loadNotebooks]);
  const runScan = async () => {
    const notebookId = current.current.notebookId;
    if (!notebookId || locked.current) return;
    locked.current = true;
    const requestId = ++sequence.current;
    send({ type: "scan", requestId });
    try { send({ type: "scanned", requestId, scan: await bridge.scan(notebookId) }); }
    catch (error) { send({ type: "failed", requestId, error: String(error) }); }
    finally { locked.current = false; }
  };
  const trash = async () => {
    const snapshot = current.current;
    if (snapshot.status !== "ready" || !snapshot.selected.size || locked.current) return;
    locked.current = true;
    const requestId = ++sequence.current;
    send({ type: "trash", requestId });
    try { send({ type: "trashed", requestId, ...await bridge.trash(snapshot.scan.token, [...snapshot.selected]) }); }
    catch (error) { send({ type: "failed", requestId, error: String(error) }); }
    finally { locked.current = false; }
  };
  const scan = state.status === "ready" || state.status === "trashing" ? state.scan : null;
  const selected = state.status === "ready" || state.status === "trashing" ? state.selected : NO_SELECTION;
  const previewPath = state.status === "ready" || state.status === "trashing" ? state.previewPath : null;
  return {
    notebooks: state.notebooks, notebookId: state.notebookId, scan, selected, previewPath,
    busy: state.status === "scanning" || state.status === "trashing", loading: state.status === "loading",
    error: state.status === "error" ? state.error : "", message: state.status === "success" ? state.message : "",
    loadNotebooks, runScan, trash,
    selectNotebook: (notebookId: string) => send({ type: "select-notebook", notebookId }),
    toggle: (path: string, preview = false) => send({ type: "toggle", path, preview }),
    selectAll: (selected: boolean) => send({ type: "select-all", selected }),
  };
}
