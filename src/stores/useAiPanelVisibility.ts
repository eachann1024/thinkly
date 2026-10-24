import { create } from "zustand";

export const useAiPanelVisibility = create<{ visible: boolean; fullscreen: boolean }>(() => ({
  visible: false,
  fullscreen: true,
}));
