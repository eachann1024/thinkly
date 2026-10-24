import { getGooseDesktop } from "./runtime";

export const quickNoteWindow = {
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
