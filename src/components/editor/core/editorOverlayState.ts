export type FindRequest = { seed: string; replace: boolean; nonce: number };
export type FindOverlayState =
  | { phase: "closed" }
  | { phase: "pending" | "reopening" | "open"; request: FindRequest };
export type LinkOverlayState = { phase: "closed" } | { phase: "open"; url: string };
export type EditorOverlayState = { find: FindOverlayState; link: LinkOverlayState };
export type EditorOverlayEvent =
  | { type: "owner-changed" }
  | { type: "find-requested"; request: FindRequest }
  | { type: "find-opened"; nonce: number }
  | { type: "find-closed" | "link-opened" | "link-closed" }
  | { type: "link-edited"; url: string };

export const initialEditorOverlays: EditorOverlayState = {
  find: { phase: "closed" }, link: { phase: "closed" },
};

export function editorOverlayReducer(state: EditorOverlayState, event: EditorOverlayEvent): EditorOverlayState {
  switch (event.type) {
    case "owner-changed": return initialEditorOverlays;
    case "find-requested": return { ...state, find: {
      phase: state.find.phase === "open" || state.find.phase === "reopening" ? "reopening" : "pending",
      request: event.request,
    } };
    case "find-opened": return (state.find.phase === "pending" || state.find.phase === "reopening") && state.find.request.nonce === event.nonce
      ? { ...state, find: { ...state.find, phase: "open" } } : state;
    case "find-closed": return { ...state, find: { phase: "closed" } };
    case "link-opened": return { ...state, link: { phase: "open", url: "" } };
    case "link-closed": return { ...state, link: { phase: "closed" } };
    case "link-edited": return state.link.phase === "open"
      ? { ...state, link: { phase: "open", url: event.url } } : state;
  }
}
