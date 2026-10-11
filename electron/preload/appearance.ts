import { ipcRenderer } from "electron";
import type { AppearanceBridge, AppearanceSnapshot } from "../../src/lib/appearance-contract";
export const appearance: AppearanceBridge = {
  get: () => ipcRenderer.invoke("desktop:appearance-get"),
  publish: (snapshot) => ipcRenderer.send("desktop:appearance-publish", snapshot),
  onChanged: (callback) => {
    const listener = (_event: unknown, snapshot: AppearanceSnapshot) => callback(snapshot);
    ipcRenderer.on("desktop:appearance-changed", listener);
    return () => ipcRenderer.removeListener("desktop:appearance-changed", listener);
  },
};
