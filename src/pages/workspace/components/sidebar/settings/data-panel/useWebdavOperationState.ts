import { useCallback, useReducer, useRef } from "react";
import {
  initialWebdavState,
  webdavReducer,
  type WebdavEvent,
} from "./webdavOperationState";

export function useWebdavOperationState() {
  const [state, dispatch] = useReducer(webdavReducer, initialWebdavState);
  const operationStateRef = useRef(state);
  const nextOperationId = useRef(0);
  const nextListId = useRef(0);
  const sendWebdavEvent = useCallback((event: WebdavEvent) => {
    operationStateRef.current = webdavReducer(operationStateRef.current, event);
    dispatch(event);
  }, []);
  const beginWebdavOperation = (
    status: "testing" | "uploading" | "findingLatest",
  ) => {
    const current = operationStateRef.current;
    if (
      current.operation.status !== "idle" ||
      current.list.status === "loading"
    )
      return null;
    const id = ++nextOperationId.current;
    sendWebdavEvent({ type: "operation.started", status, id });
    return id;
  };
  const operation = state.operation;
  return {
    operationStateRef,
    nextOperationId,
    nextListId,
    sendWebdavEvent,
    beginWebdavOperation,
    testing: operation.status === "testing",
    uploading: operation.status === "uploading",
    syncingLatest:
      operation.status === "findingLatest" ||
      (operation.status === "confirming" && operation.action === "latest") ||
      (operation.status === "restoring" && operation.origin === "latest"),
    restoringFile:
      operation.status === "restoring" && operation.origin === "restore"
        ? operation.file.basename
        : null,
    deletingFile:
      operation.status === "deleting" ? operation.file.basename : null,
    remoteLoading:
      state.list.status === "loading" && state.list.mode === "standalone",
    remoteFiles: state.list.files,
    confirmation: operation.status === "confirming" ? operation : null,
    busy: operation.status !== "idle" || state.list.status === "loading",
  };
}
