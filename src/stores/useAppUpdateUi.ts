import { create } from "zustand";
import packageInfo from "../../package.json";
import type { AppUpdateState } from "@/lib/appUpdateTypes";

type AppUpdateUi = {
  open: boolean;
  currentVersion: string;
  state: AppUpdateState;
  installing: boolean;
  installError: string;
  setOpen: (open: boolean) => void;
};

export const useAppUpdateUi = create<AppUpdateUi>((set) => ({
  open: false,
  currentVersion: packageInfo.version || "1.7.234",
  state: { status: "idle" },
  installing: false,
  installError: "",
  setOpen: (open) => set({ open }),
}));
