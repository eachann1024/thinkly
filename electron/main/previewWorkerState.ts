export type PreviewWorkerState<Worker> =
  | { status: "closed" }
  | { status: "opening"; worker: Worker; opening: Promise<void> }
  | { status: "ready"; worker: Worker };
export type PreviewWorkerEvent<Worker> =
  | { type: "open"; worker: Worker; opening: Promise<void> }
  | { type: "ready"; worker: Worker }
  | { type: "close" };
export function previewWorkerTransition<Worker>(state: PreviewWorkerState<Worker>, event: PreviewWorkerEvent<Worker>): PreviewWorkerState<Worker> {
  if (event.type === "close") return { status: "closed" };
  if (event.type === "open") return state.status === "closed" ? { status: "opening", worker: event.worker, opening: event.opening } : state;
  return state.status === "opening" && state.worker === event.worker ? { status: "ready", worker: state.worker } : state;
}
