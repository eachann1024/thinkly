import { getGooseDesktop } from "./runtime";

export const quickNoteWindow = {
  showMainWindow: async () => {
    const show = getGooseDesktop()?.showMainWindow;
    if (!show) return false;
    await show("none");
    return true;
  },
  close: () => {
    void getGooseDesktop()?.closeQuicknote();
  },
  revealSavedNote: (filePath: string) => {
    const reveal = getGooseDesktop()?.revealSavedNote;
    if (!reveal) return Promise.resolve(false);
    return reveal(filePath);
  },
  persistPosition: (_x: number, _y: number) => {},
  persistSize: () => {},
};
