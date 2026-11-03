import { ipcRenderer } from "electron";
import {
  AUXILIARY_CHANNELS,
  type AuxiliaryBridge,
  type AuxiliaryMainCommand,
  type AuxiliaryOpenRequest,
  type AuxiliarySnapshotResponse,
  type AuxiliaryWindowState,
} from "../../src/lib/auxiliary-window/contract";

let current: AuxiliaryWindowState | null = null;
const payloadListeners = new Set<(state: AuxiliaryWindowState) => void>();

ipcRenderer.on(AUXILIARY_CHANNELS.payload, (_event, state: AuxiliaryWindowState) => {
  current = state;
  for (const listener of payloadListeners) listener(state);
});

export const auxiliary: AuxiliaryBridge = {
  open: (request: AuxiliaryOpenRequest) => ipcRenderer.invoke(AUXILIARY_CHANNELS.open, request),
  get: () => ipcRenderer.invoke(AUXILIARY_CHANNELS.get),
  onPayload: (callback) => {
    if (current) queueMicrotask(() => callback(current!));
    payloadListeners.add(callback);
    return () => payloadListeners.delete(callback);
  },
  complete: (result) => ipcRenderer.invoke(AUXILIARY_CHANNELS.complete, result),
  close: () => ipcRenderer.invoke(AUXILIARY_CHANNELS.close),
  openPage: (pageId) => ipcRenderer.invoke(AUXILIARY_CHANNELS.relay, { type: "open-page", pageId }),
  openSettings: (section) => ipcRenderer.invoke(AUXILIARY_CHANNELS.relay, { type: "open-settings", section }),
  applyAISetup: (config) => ipcRenderer.invoke(AUXILIARY_CHANNELS.relay, { type: "apply-ai-setup", config }),
  requestSnapshot: <T = unknown>(key: string) =>
    ipcRenderer.invoke(AUXILIARY_CHANNELS.snapshot, key) as Promise<AuxiliarySnapshotResponse & { value?: T }>,
  onSnapshotRequest: (callback) => {
    const listener = (_event: unknown, requestId: string, key: string) => callback(requestId, key);
    ipcRenderer.on(AUXILIARY_CHANNELS.snapshotRequest, listener);
    return () => ipcRenderer.removeListener(AUXILIARY_CHANNELS.snapshotRequest, listener);
  },
  replySnapshot: (requestId, payload, ok = true) => {
    ipcRenderer.send(AUXILIARY_CHANNELS.snapshotReply, requestId, payload, ok);
  },
  onCommand: (callback) => {
    const listener = (_event: unknown, command: AuxiliaryMainCommand) => callback(command);
    ipcRenderer.on(AUXILIARY_CHANNELS.command, listener);
    return () => ipcRenderer.removeListener(AUXILIARY_CHANNELS.command, listener);
  },
};
