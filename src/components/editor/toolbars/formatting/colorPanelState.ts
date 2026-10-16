import type { PositionState } from "./colorPanelGeometry";

export type ColorPanelState =
  | { phase: "unmounted" }
  | { phase: "entering" | "open" | "leaving"; position: PositionState };

export type ColorPanelEvent =
  | { type: "pointer-entered"; position: PositionState }
  | { type: "entry-completed" }
  | { type: "leave-delay-completed" }
  | { type: "exit-completed" }
  | { type: "position-measured"; position: PositionState };

export function colorPanelReducer(state: ColorPanelState, event: ColorPanelEvent): ColorPanelState {
  switch (event.type) {
    case "pointer-entered":
      return state.phase === "unmounted"
        ? { phase: "entering", position: event.position }
        : { phase: "open", position: state.position };
    case "entry-completed":
      return state.phase === "entering" ? { ...state, phase: "open" } : state;
    case "leave-delay-completed":
      return state.phase === "unmounted" ? state : { ...state, phase: "leaving" };
    case "exit-completed":
      return state.phase === "leaving" ? { phase: "unmounted" } : state;
    case "position-measured":
      return state.phase === "unmounted" ? state : { ...state, position: event.position };
  }
}
