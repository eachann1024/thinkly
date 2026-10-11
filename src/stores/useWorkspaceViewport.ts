import { create } from "zustand";

export type SidebarPanelMode = "preview" | "engaged" | "pinned";

type State = {
  forceCollapseLeft: boolean;
  forceCollapseRight: boolean;
  leftExpandOverride: boolean;
  leftPanelMode: SidebarPanelMode;
  leftPanelPinned: boolean;
  rightExpandOverride: boolean;
  setForceCollapse: (left: boolean, right: boolean) => void;
  setLeftExpandOverride: (value: boolean) => void;
  openLeftPanel: (mode: SidebarPanelMode) => void;
  setRightExpandOverride: (value: boolean) => void;
};

export const useWorkspaceViewport = create<State>((set, get) => ({
  forceCollapseLeft: false,
  forceCollapseRight: false,
  leftExpandOverride: false,
  leftPanelMode: "pinned",
  leftPanelPinned: false,
  rightExpandOverride: false,
  setForceCollapse: (left, right) => {
    const cur = get();
    if (cur.forceCollapseLeft === left && cur.forceCollapseRight === right) {
      return;
    }
    set({
      forceCollapseLeft: left,
      forceCollapseRight: right,
      leftExpandOverride: cur.leftPanelPinned
        ? left
        : cur.leftPanelMode !== "pinned" && cur.leftExpandOverride,
      rightExpandOverride: right ? cur.rightExpandOverride : false,
    });
  },
  setLeftExpandOverride: (value) => {
    if (get().leftExpandOverride === value && (value || !get().leftPanelPinned))
      return;
    set({
      leftExpandOverride: value,
      ...(!value ? { leftPanelPinned: false } : {}),
    });
  },
  openLeftPanel: (mode) =>
    set({
      leftPanelMode: mode,
      leftPanelPinned: mode === "pinned",
      leftExpandOverride: mode !== "pinned" || get().forceCollapseLeft,
    }),
  setRightExpandOverride: (value) => {
    if (get().rightExpandOverride === value) return;
    set({ rightExpandOverride: value });
  },
}));
