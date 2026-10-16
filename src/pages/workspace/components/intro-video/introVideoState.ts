export type IntroVideoState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "closing"; ready: boolean };
type Event = { type: "ready" } | { type: "close" };
export function introVideoReducer(state: IntroVideoState, event: Event): IntroVideoState {
  if (event.type === "ready") return state.status === "closing" ? { ...state, ready: true } : { status: "ready" };
  return state.status === "closing" ? state : { status: "closing", ready: state.status === "ready" };
}
