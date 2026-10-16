export type DiagramRenderState =
  | { status: "empty" }
  | { status: "rendering"; key: string }
  | { status: "ready"; key: string; svg: string }
  | { status: "failed"; key: string };
type Event = { type: "clear" } | { type: "render"; key: string } | { type: "ready"; key: string; svg: string } | { type: "failed"; key: string };
export function diagramRenderReducer(state: DiagramRenderState, event: Event): DiagramRenderState {
  if (event.type === "clear") return { status: "empty" };
  if (event.type === "render") return { status: "rendering", key: event.key };
  if (state.status !== "rendering" || state.key !== event.key) return state;
  return event.type === "ready" ? { status: "ready", key: event.key, svg: event.svg } : { status: "failed", key: event.key };
}
