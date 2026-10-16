export type FontSelectionState =
  | { status: "closed" }
  | { status: "open"; original: string | null }
  | { status: "previewing"; original: string | null; font: string | null };
export type FontSelectionEvent =
  | { type: "open"; original: string | null }
  | { type: "preview"; font: string | null }
  | { type: "confirm"; font: string | null }
  | { type: "cancel" };
export function fontSelectionReducer(state: FontSelectionState, event: FontSelectionEvent): FontSelectionState {
  if (event.type === "open") return state.status === "closed" ? { status: "open", original: event.original } : state;
  if (event.type === "cancel" || event.type === "confirm") return { status: "closed" };
  return state.status === "closed" ? state : { status: "previewing", original: state.original, font: event.font };
}
