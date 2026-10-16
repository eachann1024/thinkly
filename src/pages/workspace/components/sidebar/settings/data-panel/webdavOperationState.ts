import type { WebdavBackupFile } from "@/lib/webdavSync";
export type WebdavConnection = {
  url: string;
  username: string;
  password: string;
  dir: string;
};
export type WebdavConfirmation = {
  connection: WebdavConnection;
  action: "latest" | "restore" | "delete";
  file: WebdavBackupFile;
  epoch: number;
};
export type WebdavOperation =
  | { status: "idle" }
  | { status: "testing" | "uploading" | "findingLatest"; id: number }
  | ({ status: "confirming"; id: number } & WebdavConfirmation)
  | {
      status: "restoring";
      id: number;
      file: WebdavBackupFile;
      origin: "latest" | "restore";
    }
  | { status: "deleting"; id: number; file: WebdavBackupFile };
export type WebdavListState =
  | { status: "ready"; files: WebdavBackupFile[] }
  | {
      status: "loading";
      id: number;
      mode: "standalone" | "nested";
      files: WebdavBackupFile[];
    };
export type WebdavState = { operation: WebdavOperation; list: WebdavListState };
export type WebdavEvent =
  | {
      type: "operation.started";
      status: "testing" | "uploading" | "findingLatest";
      id: number;
    }
  | ({ type: "confirmation.requested"; id: number } & WebdavConfirmation)
  | { type: "confirmation.accepted"; id: number }
  | { type: "confirmation.cancelled" | "panel.deactivated" }
  | { type: "operation.finished"; id: number }
  | { type: "list.started"; id: number; mode: "standalone" | "nested" }
  | { type: "list.loaded"; id: number; files: WebdavBackupFile[] }
  | { type: "list.failed"; id: number };
export const initialWebdavState: WebdavState = {
  operation: { status: "idle" },
  list: { status: "ready", files: [] },
};
export function webdavReducer(
  state: WebdavState,
  event: WebdavEvent,
): WebdavState {
  const operation = state.operation;
  switch (event.type) {
    case "operation.started":
      return operation.status === "idle"
        ? { ...state, operation: { status: event.status, id: event.id } }
        : state;
    case "confirmation.requested":
      if (
        operation.status !== "idle" &&
        !(operation.status === "findingLatest" && operation.id === event.id)
      )
        return state;
      return {
        ...state,
        operation: {
          status: "confirming",
          id: event.id,
          action: event.action,
          file: event.file,
          epoch: event.epoch,
          connection: event.connection,
        },
      };
    case "confirmation.accepted":
      if (operation.status !== "confirming" || operation.id !== event.id)
        return state;
      return {
        ...state,
        operation:
          operation.action === "delete"
            ? { status: "deleting", id: operation.id, file: operation.file }
            : {
                status: "restoring",
                id: operation.id,
                file: operation.file,
                origin: operation.action,
              },
      };
    case "confirmation.cancelled":
      return operation.status === "confirming"
        ? { ...state, operation: { status: "idle" } }
        : state;
    case "panel.deactivated":
      return {
        operation:
          operation.status === "confirming" ? { status: "idle" } : operation,
        list: { status: "ready", files: state.list.files },
      };
    case "operation.finished":
      return operation.status !== "idle" && operation.id === event.id
        ? { ...state, operation: { status: "idle" } }
        : state;
    case "list.started":
      return {
        ...state,
        list: {
          status: "loading",
          id: event.id,
          mode: event.mode,
          files: state.list.files,
        },
      };
    case "list.loaded":
      return state.list.status === "loading" && state.list.id === event.id
        ? { ...state, list: { status: "ready", files: event.files } }
        : state;
    case "list.failed":
      return state.list.status === "loading" && state.list.id === event.id
        ? { ...state, list: { status: "ready", files: state.list.files } }
        : state;
  }
}
