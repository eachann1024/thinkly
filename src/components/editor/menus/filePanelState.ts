export type FilePanelState =
  | { phase: "idle" }
  | { phase: "uploading"; request: number }
  | { phase: "error"; message: string };
export type FilePanelEvent =
  | { type: "form-edited" | "owner-changed" }
  | { type: "upload-started"; request: number }
  | { type: "upload-completed"; request: number }
  | { type: "upload-failed"; request: number; message: string }
  | { type: "url-invalid"; message: string };

export function filePanelReducer(state: FilePanelState, event: FilePanelEvent): FilePanelState {
  switch (event.type) {
    case "owner-changed": return { phase: "idle" };
    case "form-edited": return state.phase === "uploading" ? state : { phase: "idle" };
    case "upload-started": return { phase: "uploading", request: event.request };
    case "upload-completed": return state.phase === "uploading" && state.request === event.request ? { phase: "idle" } : state;
    case "upload-failed": return state.phase === "uploading" && state.request === event.request
      ? { phase: "error", message: event.message } : state;
    case "url-invalid": return state.phase === "uploading" ? state : { phase: "error", message: event.message };
  }
}
