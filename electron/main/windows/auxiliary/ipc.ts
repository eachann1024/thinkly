import { BrowserWindow, ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import {
  AUXILIARY_CHANNELS,
  type AuxiliaryMainCommand,
  type AuxiliaryRelayMessage,
  type AuxiliarySnapshotResponse,
} from "../../../../src/lib/auxiliary-window/contract";
import { deliverWorkspaceNotification } from "../../notifications";
import { showOrCreateMainWindow } from "../activation";
import { openAuxiliaryWindow, releaseAuxiliaryResult } from "./factory";
import { parseAuxiliaryOpenRequest, parseAuxiliarySection } from "./kinds";
import {
  auxiliaryState,
  findAuxiliaryWindow,
  finishAuxiliary,
} from "./session";

const snapshotWaiters = new Map<string, {
  senderId: number;
  resolve: (response: AuxiliarySnapshotResponse) => void;
}>();

function mainFrame(event: Electron.IpcMainInvokeEvent): boolean {
  return event.senderFrame === event.sender.mainFrame;
}

function senderRecord(event: Electron.IpcMainInvokeEvent) {
  if (!mainFrame(event)) return null;
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return null;
  return findAuxiliaryWindow(win) ?? null;
}

function sendCommand(command: AuxiliaryMainCommand): boolean {
  const win = showOrCreateMainWindow();
  if (win.isDestroyed() || win.webContents.isDestroyed()) return false;
  const send = () => {
    if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.webContents.send(AUXILIARY_CHANNELS.command, command);
    }
  };
  if (win.webContents.isLoading()) win.webContents.once("did-finish-load", send);
  else send();
  return true;
}

function jsonValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  const raw = JSON.stringify(value);
  if (!raw || raw.length > 2_000_000) throw new Error("auxiliary-values");
  return JSON.parse(raw) as unknown;
}

export function registerAuxiliaryIpc(): void {
  ipcMain.handle(AUXILIARY_CHANNELS.open, (event, request: unknown) => {
    if (!mainFrame(event)) throw new Error("auxiliary-frame");
    return openAuxiliaryWindow(parseAuxiliaryOpenRequest(request));
  });

  ipcMain.handle(AUXILIARY_CHANNELS.get, (event) => {
    const record = senderRecord(event);
    return record ? auxiliaryState(record) : null;
  });

  ipcMain.handle(AUXILIARY_CHANNELS.complete, (event, body: unknown) => {
    const record = senderRecord(event);
    if (!record || !body || typeof body !== "object" || Array.isArray(body)) return;
    const raw = body as Record<string, unknown>;
    if (raw.status !== "confirmed" && raw.status !== "cancelled") return;
    const values = raw.values === undefined ? undefined : jsonValue(raw.values);
    releaseAuxiliaryResult(record, raw.status, values);
    if (!record.win.isDestroyed()) record.win.close();
  });

  ipcMain.handle(AUXILIARY_CHANNELS.close, (event) => {
    const record = senderRecord(event);
    if (!record || record.win.isDestroyed()) return;
    finishAuxiliary(record, "cancelled");
    record.win.close();
  });

  ipcMain.handle(AUXILIARY_CHANNELS.relay, (event, message: unknown) => {
    const record = senderRecord(event);
    if (!record || !message || typeof message !== "object" || Array.isArray(message)) return false;
    const relay = message as AuxiliaryRelayMessage;
    if (relay.type === "open-page") {
      if (typeof relay.pageId !== "string" || relay.pageId.length < 1 || relay.pageId.length > 200) return false;
      return sendCommand({ type: "open-page", pageId: relay.pageId });
    }
    if (relay.type === "open-settings") {
      return deliverWorkspaceNotification({ type: "settings", tab: parseAuxiliarySection(relay.section) });
    }
    return false;
  });

  ipcMain.handle(AUXILIARY_CHANNELS.snapshot, (event, key: unknown) => {
    if (!senderRecord(event)) return { ok: false } satisfies AuxiliarySnapshotResponse;
    if (typeof key !== "string" || key.length < 1 || key.length > 80) return { ok: false };
    const win = showOrCreateMainWindow();
    if (win.isDestroyed() || win.webContents.isDestroyed()) return { ok: false };
    const requestId = randomUUID();
    return new Promise<AuxiliarySnapshotResponse>((resolve) => {
      const timer = setTimeout(() => finish({ ok: false }), 10_000);
      const finish = (response: AuxiliarySnapshotResponse) => {
        clearTimeout(timer);
        snapshotWaiters.delete(requestId);
        resolve(response);
      };
      snapshotWaiters.set(requestId, { senderId: win.webContents.id, resolve: finish });
      const send = () => {
        if (win.isDestroyed() || win.webContents.isDestroyed()) finish({ ok: false });
        else win.webContents.send(AUXILIARY_CHANNELS.snapshotRequest, requestId, key);
      };
      if (win.webContents.isLoading()) win.webContents.once("did-finish-load", send);
      else send();
    });
  });

  ipcMain.on(AUXILIARY_CHANNELS.snapshotReply, (event, requestId: unknown, payload: unknown, ok: unknown) => {
    if (typeof requestId !== "string" || event.senderFrame !== event.sender.mainFrame) return;
    const waiter = snapshotWaiters.get(requestId);
    if (!waiter || waiter.senderId !== event.sender.id) return;
    if (ok === false) {
      waiter.resolve({ ok: false });
      return;
    }
    let value: unknown = null;
    if (payload !== undefined) {
      try {
        const raw = JSON.stringify(payload);
        if (!raw || raw.length > 8_000_000) {
          waiter.resolve({ ok: false });
          return;
        }
        value = JSON.parse(raw) as unknown;
      } catch {
        waiter.resolve({ ok: false });
        return;
      }
    }
    waiter.resolve({ ok: true, value });
  });
}
