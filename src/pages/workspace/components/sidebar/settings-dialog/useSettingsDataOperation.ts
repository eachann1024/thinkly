import { useCallback, useReducer, useRef } from "react";
import {
  initialSettingsDataOperationState,
  settingsDataOperationReducer,
  type SettingsDataOperationEvent,
} from "./settingsDataOperationState";

export function useSettingsDataOperation() {
  const [state, dispatch] = useReducer(
    settingsDataOperationReducer,
    initialSettingsDataOperationState,
  );
  const dataOperationRef = useRef(state);
  const nextId = useRef(0);
  const sendDataEvent = useCallback((event: SettingsDataOperationEvent) => {
    dataOperationRef.current = settingsDataOperationReducer(
      dataOperationRef.current,
      event,
    );
    dispatch(event);
  }, []);
  const beginDataOperation = (
    kind: "export" | "import" | "reset" | "restore",
  ) => {
    const current = dataOperationRef.current;
    if (
      (kind === "export" && current.export.status !== "idle") ||
      (kind === "import" && current.import.status !== "idle") ||
      (kind === "reset" && current.reset.status !== "confirming") ||
      (kind === "restore" &&
        current.reset.status !== "closed" &&
        current.reset.status !== "confirming")
    )
      return null;
    const id = ++nextId.current;
    sendDataEvent({ type: `${kind}.started`, id });
    return id;
  };
  const onResetDialogOpenChange = (open: boolean) =>
    sendDataEvent({ type: open ? "reset.opened" : "reset.closed" });
  return {
    sendDataEvent,
    beginDataOperation,
    onResetDialogOpenChange,
    exporting: state.export.status === "exporting",
    importing: state.import.status !== "idle",
    resetDialogOpen:
      state.reset.status === "confirming" ||
      (state.reset.status === "resetting" && state.reset.dialog === "open"),
    resetting: state.reset.status === "resetting",
  };
}
