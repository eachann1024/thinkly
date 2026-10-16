export type ExportState =
  | { status: "idle" }
  | { status: "exporting"; id: number };
export type ImportState =
  | { status: "idle" }
  | { status: "picking" | "importing"; id: number };
export type ResetState =
  | { status: "closed" | "confirming" }
  | { status: "resetting"; id: number; dialog: "open" | "closed" }
  | { status: "restoring"; id: number };
export type SettingsDataOperationState = {
  export: ExportState;
  import: ImportState;
  reset: ResetState;
};
export type SettingsDataOperationEvent =
  | {
      type:
        | "export.started"
        | "export.finished"
        | "import.started"
        | "import.fileChosen"
        | "import.finished"
        | "reset.started"
        | "restore.started"
        | "reset.finished"
        | "restore.finished";
      id: number;
    }
  | { type: "reset.opened" | "reset.closed" | "settings.closed" };
export const initialSettingsDataOperationState: SettingsDataOperationState = {
  export: { status: "idle" },
  import: { status: "idle" },
  reset: { status: "closed" },
};
export function settingsDataOperationReducer(
  state: SettingsDataOperationState,
  event: SettingsDataOperationEvent,
): SettingsDataOperationState {
  switch (event.type) {
    case "export.started":
      return state.export.status === "idle"
        ? { ...state, export: { status: "exporting", id: event.id } }
        : state;
    case "export.finished":
      return state.export.status === "exporting" && state.export.id === event.id
        ? { ...state, export: { status: "idle" } }
        : state;
    case "import.started":
      return state.import.status === "idle"
        ? { ...state, import: { status: "picking", id: event.id } }
        : state;
    case "import.fileChosen":
      return state.import.status === "picking" && state.import.id === event.id
        ? { ...state, import: { status: "importing", id: event.id } }
        : state;
    case "import.finished":
      return state.import.status !== "idle" && state.import.id === event.id
        ? { ...state, import: { status: "idle" } }
        : state;
    case "reset.opened":
      if (state.reset.status === "resetting")
        return { ...state, reset: { ...state.reset, dialog: "open" } };
      return state.reset.status === "closed"
        ? { ...state, reset: { status: "confirming" } }
        : state;
    case "reset.closed":
    case "settings.closed":
      return state.reset.status === "resetting"
        ? { ...state, reset: { ...state.reset, dialog: "closed" } }
        : state.reset.status === "confirming"
          ? { ...state, reset: { status: "closed" } }
          : state;
    case "reset.started":
      return state.reset.status === "confirming"
        ? {
            ...state,
            reset: { status: "resetting", id: event.id, dialog: "open" },
          }
        : state;
    case "restore.started":
      return state.reset.status === "closed" ||
        state.reset.status === "confirming"
        ? { ...state, reset: { status: "restoring", id: event.id } }
        : state;
    case "reset.finished":
      return state.reset.status === "resetting" && state.reset.id === event.id
        ? {
            ...state,
            reset: {
              status: state.reset.dialog === "open" ? "confirming" : "closed",
            },
          }
        : state;
    case "restore.finished":
      return state.reset.status === "restoring" && state.reset.id === event.id
        ? { ...state, reset: { status: "closed" } }
        : state;
  }
}
