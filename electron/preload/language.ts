import { contextBridge, ipcRenderer } from "electron";
import type { LanguagePreference, LanguageSnapshot } from "../../src/i18n/contract";

const initialSnapshot: LanguageSnapshot = ipcRenderer.sendSync("desktop:language-initial");
contextBridge.exposeInMainWorld("gooseLanguage", {
  initialSnapshot,
  getSnapshot: (): Promise<LanguageSnapshot> => ipcRenderer.invoke("desktop:language-get"),
  setPreference: (preference: LanguagePreference): Promise<LanguageSnapshot> => ipcRenderer.invoke("desktop:language-set", preference),
  resetPreference: (): Promise<LanguageSnapshot> => ipcRenderer.invoke("desktop:language-reset"),
  onSnapshot: (callback: (snapshot: LanguageSnapshot) => void) => {
    const listener = (_event: unknown, snapshot: LanguageSnapshot) => callback(snapshot);
    ipcRenderer.on("desktop:language-changed", listener);
    return () => ipcRenderer.removeListener("desktop:language-changed", listener);
  },
});
