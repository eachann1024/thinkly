import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/git-sync/useGitSyncState.ts#localMessages:1">`
zh-Hans:
  couldNotReadConfiguration_a6ab: "读取配置失败"
en:
  couldNotReadConfiguration_a6ab: "Could not read configuration"
`;
const uiText = createTranslator(localMessages);
import { useCallback, useEffect, useReducer, useState } from "react";
import type { GitSyncBridge, GitSyncState } from "@/lib/git-sync-contract";
import { gitSyncLoadReducer } from "./gitSyncLoadState";

const EMPTY_STATE: GitSyncState = { configs: [], statuses: [] };
export function useGitSyncState(bridge: GitSyncBridge | undefined, visible: boolean) {
  const [request, dispatch] = useReducer(gitSyncLoadReducer, bridge
    ? { status: "loading", snapshot: null } : { status: "unavailable" });
  const [revision, setRevision] = useState(0);
  const applyState = useCallback((snapshot: GitSyncState) => dispatch({ type: "received", snapshot }), []);
  useEffect(() => {
    if (!bridge || !visible) return;
    let mounted = true;
    let pushed = false;
    dispatch({ type: "load" });
    const unsubscribe = bridge.onState(next => {
      if (!mounted) return;
      pushed = true;
      applyState(next);
    });
    bridge.getState().then(next => {
      if (mounted && !pushed) applyState(next);
    }).catch((error: unknown) => {
      if (mounted && !pushed) dispatch({ type: "failed", error: error instanceof Error ? error.message : uiText("couldNotReadConfiguration_a6ab") });
    });
    return () => { mounted = false; unsubscribe(); };
  }, [bridge, visible, revision, applyState]);
  const reload = () => {
    dispatch({ type: "load" });
    setRevision(value => value + 1);
  };
  return {
    state: request.status === "unavailable" ? EMPTY_STATE : request.snapshot ?? EMPTY_STATE,
    applyState, loading: request.status === "loading",
    loadError: request.status === "error" ? request.error : "", reload,
  };
}
