import { create } from "zustand";

// Deliberately not persisted: quitting mid-video means it is never shown again.
interface IntroVideoState {
  open: boolean;
  show: () => void;
  hide: () => void;
}

export const useIntroVideo = create<IntroVideoState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));
