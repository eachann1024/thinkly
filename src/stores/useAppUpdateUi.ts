import { create } from "zustand";
import packageInfo from "../../package.json";
import {
  appUpdateUiTransition,
  type AppUpdateUiEvent,
  type AppUpdateUiState,
} from "./appUpdateUiState";

type AppUpdateUi = AppUpdateUiState & {
  send: (event: AppUpdateUiEvent) => void;
  setOpen: (open: boolean) => void;
};
export const useAppUpdateUi = create<AppUpdateUi>((set, get) => ({
  open: false,
  currentVersion: packageInfo.version || "1.7.234",
  state: { status: "idle" },
  operation: { status: "idle" },
  send: (event) => set((ui) => appUpdateUiTransition(ui, event)),
  setOpen: (open) => get().send({ type: "open.changed", open }),
}));
