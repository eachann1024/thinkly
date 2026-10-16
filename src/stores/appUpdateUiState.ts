import { hasNewAppUpdate } from "@/lib/appUpdateAvailability";
import { appUpdateTransition } from "@/lib/appUpdateState";
import type { AppUpdateState, AppUpdateTarget } from "@/lib/appUpdateTypes";
export type UpdateUiOperation =
  | { status: "idle" }
  | { status: "installing"; id: number }
  | { status: "failed"; message: string };
export type AppUpdateUiState = {
  open: boolean;
  currentVersion: string;
  state: AppUpdateState;
  operation: UpdateUiOperation;
};
export type AppUpdateUiEvent =
  | { type: "open.changed"; open: boolean }
  | { type: "version.received"; version: string }
  | { type: "state.received"; state: AppUpdateState }
  | { type: "download.started"; target: AppUpdateTarget }
  | { type: "install.started"; id: number }
  | { type: "install.failed"; id: number; message: string }
  | { type: "feedback.dismissed" }
  | { type: "reveal.failed"; message: string };
export function appUpdateUiTransition(
  ui: AppUpdateUiState,
  event: AppUpdateUiEvent,
): AppUpdateUiState {
  switch (event.type) {
    case "open.changed":
      return { ...ui, open: event.open };
    case "version.received":
      return { ...ui, currentVersion: event.version };
    case "state.received":
      return {
        ...ui,
        state: event.state,
        open: ui.open && hasNewAppUpdate(ui.currentVersion, event.state),
      };
    case "download.started":
      return {
        ...ui,
        operation: { status: "idle" },
        state: appUpdateTransition(ui.state, event),
      };
    case "install.started":
      return ui.state.status === "ready" && ui.operation.status !== "installing"
        ? { ...ui, operation: { status: "installing", id: event.id } }
        : ui;
    case "install.failed":
      return ui.operation.status === "installing" &&
        ui.operation.id === event.id
        ? { ...ui, operation: { status: "failed", message: event.message } }
        : ui;
    case "feedback.dismissed":
      return ui.operation.status === "failed"
        ? { ...ui, operation: { status: "idle" } }
        : ui;
    case "reveal.failed":
      return ui.operation.status === "installing"
        ? ui
        : { ...ui, operation: { status: "failed", message: event.message } };
  }
}
