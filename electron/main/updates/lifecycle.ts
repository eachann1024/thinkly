import type { VerifiedUpdate } from "./release";
export type UpdateLifecycle =
  | { phase: "empty" | "restoring" }
  | { phase: "downloading"; id: number }
  | { phase: "ready" | "installing" | "invalidating"; update: VerifiedUpdate };
export type UpdateLifecycleEvent =
  | { type: "restore.started" | "restore.finished" }
  | { type: "download.started" | "download.finished"; id: number }
  | { type: "update.ready"; update: VerifiedUpdate }
  | { type: "install.started" | "install.invalidated" | "install.finished" };
export function updateLifecycleTransition(
  state: UpdateLifecycle,
  event: UpdateLifecycleEvent,
): UpdateLifecycle {
  switch (event.type) {
    case "restore.started":
      return state.phase === "empty" ? { phase: "restoring" } : state;
    case "restore.finished":
      return state.phase === "restoring" ? { phase: "empty" } : state;
    case "download.started":
      return state.phase === "empty"
        ? { phase: "downloading", id: event.id }
        : state;
    case "download.finished":
      return state.phase === "downloading" && state.id === event.id
        ? { phase: "empty" }
        : state;
    case "update.ready":
      return state.phase === "restoring" || state.phase === "downloading"
        ? { phase: "ready", update: event.update }
        : state;
    case "install.started":
      return state.phase === "ready"
        ? { phase: "installing", update: state.update }
        : state;
    case "install.invalidated":
      return state.phase === "installing"
        ? { phase: "invalidating", update: state.update }
        : state;
    case "install.finished":
      return state.phase === "installing"
        ? { phase: "ready", update: state.update }
        : state.phase === "invalidating"
          ? { phase: "empty" }
          : state;
  }
}
export type AutomaticUpdates = { phase: "stopped" | "restoring" | "scheduled" };
export function automaticUpdatesTransition(
  state: AutomaticUpdates,
  event: "started" | "restored" | "failed",
): AutomaticUpdates {
  if (event === "started")
    return state.phase === "stopped" ? { phase: "restoring" } : state;
  if (state.phase !== "restoring") return state;
  return { phase: event === "restored" ? "scheduled" : "stopped" };
}
