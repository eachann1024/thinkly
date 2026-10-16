type UndoCopy = { original: string; backup: string };
export type TrashUndoState =
  | { status: "missing" }
  | ({ status: "retained"; timer: NodeJS.Timeout } & UndoCopy)
  | ({ status: "restoring" } & UndoCopy);
export type TrashUndoEvent =
  | ({ type: "retain"; timer: NodeJS.Timeout } & UndoCopy)
  | { type: "restore" }
  | { type: "retry"; timer: NodeJS.Timeout }
  | { type: "restored" }
  | { type: "expire"; timer: NodeJS.Timeout };
export function trashUndoTransition(state: TrashUndoState, event: TrashUndoEvent): TrashUndoState {
  if (event.type === "retain") return state.status === "missing" ? { status: "retained", original: event.original, backup: event.backup, timer: event.timer } : state;
  if (event.type === "expire") return state.status === "retained" && state.timer === event.timer ? { status: "missing" } : state;
  if (event.type === "restore") return state.status === "retained" ? { status: "restoring", original: state.original, backup: state.backup } : state;
  if (state.status !== "restoring") return state;
  return event.type === "restored" ? { status: "missing" } : { status: "retained", original: state.original, backup: state.backup, timer: event.timer };
}
