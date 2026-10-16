import { create } from "zustand";

export type SidebarPanelMode = "preview" | "engaged";

type State = {
  forceCollapseLeft: boolean;
  forceCollapseRight: boolean;
  leftExpandOverride: boolean;
  leftPanelMode: SidebarPanelMode;
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
  leftPanelMode: "engaged",
  rightExpandOverride: false,
  setForceCollapse: (left, right) => {
    const cur = get();
    if (cur.forceCollapseLeft === left && cur.forceCollapseRight === right) {
      return;
    }
    set({
      forceCollapseLeft: left,
      forceCollapseRight: right,
      leftExpandOverride: left && cur.forceCollapseLeft && cur.leftExpandOverride,
      rightExpandOverride: right ? cur.rightExpandOverride : false,
    });
  },
  setLeftExpandOverride: (value) => {
    if (get().leftExpandOverride === value) return;
    set({ leftExpandOverride: value });
  },
  openLeftPanel: (mode) =>
    set({
      leftPanelMode: mode,
      leftExpandOverride: get().forceCollapseLeft,
    }),
  setRightExpandOverride: (value) => {
    if (get().rightExpandOverride === value) return;
    set({ rightExpandOverride: value });
  },
}));
