import { useEffect, useState } from "react";
import type { GitSyncBridge, GitSyncState } from "@/lib/git-sync-contract";

export function useGitSyncState(bridge: GitSyncBridge | undefined, visible: boolean) {
  const [state, setState] = useState<GitSyncState>({ configs: [], statuses: [] });
  const [loading, setLoading] = useState(Boolean(bridge));
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!bridge || !visible) return;
    let mounted = true;
    const apply = (next: GitSyncState) => {
      if (mounted) setState(next);
    };
    const unsubscribe = bridge.onState(apply);
    bridge
      .getState()
      .then(apply)
      .catch((error: unknown) => {
        if (mounted) setLoadError(error instanceof Error ? error.message : "读取配置失败");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [bridge, visible, revision]);
  const reload = () => {
    setLoadError("");
    setLoading(true);
    setRevision((value) => value + 1);
  };
  return { state, setState, loading, loadError, reload };
}
