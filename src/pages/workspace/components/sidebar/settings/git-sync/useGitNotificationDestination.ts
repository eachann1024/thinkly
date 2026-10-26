import { useEffect, useRef, useState } from "react";
import { useNotificationDestination } from "@/stores/useNotificationDestination";
import type { GitSyncState } from "@/lib/git-sync-contract";

export type GitNotificationTarget =
  | { kind: "none" }
  | { kind: "found"; repositoryId: string }
  | { kind: "missing" };

export function resolveGitNotificationTarget(
  repositoryId: string | null,
  state: Pick<GitSyncState, "configs">,
): GitNotificationTarget {
  if (!repositoryId) return { kind: "none" };
  return state.configs.some((config) => config.id === repositoryId)
    ? { kind: "found", repositoryId }
    : { kind: "missing" };
}

export function useGitNotificationDestination(
  visible: boolean, loading: boolean, loadError: string, state: GitSyncState,
  select: (id: string) => void, setAdding: (adding: boolean) => void,
): { missingTarget: boolean; preferredRepositoryId?: string; clearMissingTarget: () => void } {
  const repositoryId = useNotificationDestination((value) => value.repositoryId);
  const requestId = useNotificationDestination((value) => value.requestId);
  const consumedRequestId = useNotificationDestination((value) => value.consumedRequestId);
  const [missingTarget, setMissingTarget] = useState(false);
  const lastConsumedRequestId = useRef(0);
  const requestPending = requestId > Math.max(lastConsumedRequestId.current, consumedRequestId);
  const target = resolveGitNotificationTarget(repositoryId, state);
  const pendingMissing = requestPending && visible && !loading && !loadError && target.kind === "missing";
  const preferredRepositoryId =
    requestPending && visible && !loading && !loadError && target.kind === "found" ? target.repositoryId : undefined;
  useEffect(() => {
    if (!visible) {
      setMissingTarget(false);
      return;
    }
    if (requestId <= lastConsumedRequestId.current) return;
    if (!repositoryId) {
      setMissingTarget(false);
      lastConsumedRequestId.current = requestId;
      useNotificationDestination.getState().consumeRepositoryRequest(requestId);
      return;
    }
    if (loading || loadError) return;
    const resolved = resolveGitNotificationTarget(repositoryId, state);
    select(resolved.kind === "found" ? resolved.repositoryId : "");
    setAdding(false);
    setMissingTarget(resolved.kind === "missing");
    lastConsumedRequestId.current = requestId;
    useNotificationDestination.getState().consumeRepositoryRequest(requestId);
  }, [visible, loading, loadError, state, repositoryId, requestId, select, setAdding]);
  return {
    missingTarget: requestPending ? pendingMissing : missingTarget,
    preferredRepositoryId,
    clearMissingTarget: () => setMissingTarget(false),
  };
}
