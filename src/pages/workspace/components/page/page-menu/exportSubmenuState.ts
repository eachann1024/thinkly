export type ExportSubmenuState =
  | { status: "closed" } | { status: "opening" } | { status: "open" }
  | { status: "closing" } | { status: "suppressed" };
export type ExportSubmenuEvent = { type: "enter" | "leave" | "open-delay" | "close-delay" | "activate" | "dismiss" | "disable" };
export function exportSubmenuReducer(state: ExportSubmenuState, event: ExportSubmenuEvent): ExportSubmenuState {
  switch (event.type) {
    case "disable": return { status: "closed" };
    case "dismiss": return { status: "suppressed" };
    case "activate": return { status: "open" };
    case "enter": return state.status === "closed" ? { status: "opening" } : state.status === "closing" ? { status: "open" } : state;
    case "leave": return state.status === "open" ? { status: "closing" } : state.status === "opening" || state.status === "suppressed" ? { status: "closed" } : state;
    case "open-delay": return state.status === "opening" ? { status: "open" } : state;
    case "close-delay": return state.status === "closing" ? { status: "closed" } : state;
  }
}
export const exportSubmenuIsOpen = (state: ExportSubmenuState) => state.status === "open" || state.status === "closing";
