export type GitSchedulerState = {
  phase: "stopped" | "running" | "ticking" | "stopping";
};
export type GitSchedulerEvent =
  | "scheduler.started"
  | "scheduler.stopped"
  | "tick.started"
  | "tick.finished";
export function gitSchedulerTransition(
  state: GitSchedulerState,
  event: GitSchedulerEvent,
): GitSchedulerState {
  switch (event) {
    case "scheduler.started":
      return {
        phase:
          state.phase === "ticking" || state.phase === "stopping"
            ? "ticking"
            : "running",
      };
    case "scheduler.stopped":
      return {
        phase:
          state.phase === "ticking" || state.phase === "stopping"
            ? "stopping"
            : "stopped",
      };
    case "tick.started":
      return state.phase === "running" ? { phase: "ticking" } : state;
    case "tick.finished":
      return state.phase === "ticking"
        ? { phase: "running" }
        : state.phase === "stopping"
          ? { phase: "stopped" }
          : state;
  }
}
export type GitLoadState = { phase: "unread" | "loading" | "ready" };
export function gitLoadTransition(
  state: GitLoadState,
  event: "load.started" | "load.succeeded" | "load.failed",
): GitLoadState {
  if (event === "load.started")
    return state.phase === "unread" ? { phase: "loading" } : state;
  if (state.phase !== "loading") return state;
  return { phase: event === "load.succeeded" ? "ready" : "unread" };
}
