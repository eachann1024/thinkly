import { BrowserWindow } from "electron";
import { randomUUID } from "node:crypto";
import {
  AUXILIARY_CHANNELS,
  type AuxiliaryKind,
  type AuxiliaryOpenRequest,
  type AuxiliaryOpenResponse,
  type AuxiliaryResult,
} from "../../../../src/lib/auxiliary-window/contract";
import { bindCloseTabAccelerator } from "../close";
import {
  applyTrafficLightPosition,
  framelessWindowIcon,
  rendererDevUrl,
  rendererFile,
  sharedWebPrefs,
  trafficLightPosition,
} from "../configuration";
import { showOrCreateMainWindow } from "../activation";
import { getMainWindow } from "../registry";
import { clampAuxiliaryBox, readAuxiliaryBounds } from "./bounds";
import { attachStandaloneFrame, standaloneBackground } from "./frame";
import { auxiliaryKindConfig, auxiliaryKindTitle } from "./kinds";
import {
  auxiliaryState,
  blockAuxiliaryParent,
  dropAuxiliary,
  finishAuxiliary,
  putAuxiliary,
  auxiliaryRecord,
  unblockAuxiliaryParent,
  type AuxiliaryRecord,
} from "./session";

const PARTITION = "auxiliary";

function publish(record: AuxiliaryRecord): void {
  const message = auxiliaryState(record);
  const send = () => {
    if (!record.win.isDestroyed() && !record.win.webContents.isDestroyed()) {
      record.win.webContents.send(AUXILIARY_CHANNELS.payload, message);
    }
  };
  if (record.win.webContents.isLoading()) record.win.webContents.once("did-finish-load", send);
  else send();
}

function focus(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function centerOn(parent: BrowserWindow, size: { width: number; height: number }, min: { width: number; height: number }) {
  const anchor = parent.isDestroyed() ? null : parent.getBounds();
  const x = anchor ? Math.round(anchor.x + (anchor.width - size.width) / 2) : 0;
  const y = anchor ? Math.round(anchor.y + (anchor.height - size.height) / 2) : 0;
  if (!anchor) return size;
  try {
    return clampAuxiliaryBox({ x, y, width: size.width, height: size.height }, min);
  } catch {
    return { width: size.width, height: size.height };
  }
}

function resolvedBox(
  kind: AuxiliaryKind,
  request: AuxiliaryOpenRequest,
  center: boolean,
): { parent: BrowserWindow; bounds: Pick<Electron.Rectangle, "width" | "height"> & Partial<Electron.Point> } {
  const config = auxiliaryKindConfig(kind);
  const stored = config.resizable ? readAuxiliaryBounds(kind) : null;
  const width = request.size?.width ?? stored?.width ?? config.width;
  const height = request.size?.height ?? stored?.height ?? config.height;
  const min = { width: config.minWidth, height: config.minHeight };
  const parent = getMainWindow() ?? showOrCreateMainWindow();
  if (center || stored == null) return { parent, bounds: centerOn(parent, { width, height }, min) };
  try {
    return {
      parent,
      bounds: clampAuxiliaryBox({ x: stored.x, y: stored.y, width, height }, min),
    };
  } catch {
    return { parent, bounds: { width, height } };
  }
}

function adopt(record: AuxiliaryRecord, request: AuxiliaryOpenRequest): void {
  finishAuxiliary(record, "cancelled");
  record.settled = false;
  record.requestId = randomUUID();
  record.payload = request.payload ?? null;
  const config = auxiliaryKindConfig(record.kind);
  if (!config.resizable && request.size) {
    const box = resolvedBox(record.kind, request, config.modal);
    if (!record.win.isDestroyed()) record.win.setBounds(box.bounds);
  } else if (config.modal && !record.win.isDestroyed()) {
    const box = resolvedBox(record.kind, request, true);
    record.win.setBounds(box.bounds);
  }
  publish(record);
  focus(record.win);
}

function waitFor(record: AuxiliaryRecord): Promise<AuxiliaryOpenResponse> {
  if (!record.modal) {
    return Promise.resolve({ status: "opened", requestId: record.requestId, kind: record.kind });
  }
  return new Promise((resolve) => {
    record.waiters.push(resolve);
  });
}

function load(win: BrowserWindow): void {
  const devUrl = rendererDevUrl();
  if (devUrl) void win.loadURL(`${devUrl}/window.html`);
  else void win.loadFile(rendererFile("window.html"));
}

export function openAuxiliaryWindow(request: AuxiliaryOpenRequest): Promise<AuxiliaryOpenResponse> {
  const existing = auxiliaryRecord(request.kind);
  if (existing) {
    adopt(existing, request);
    return waitFor(existing);
  }
  const config = auxiliaryKindConfig(request.kind);
  const { parent, bounds } = resolvedBox(request.kind, request, config.modal);
  const isMac = process.platform === "darwin";
  const icon = framelessWindowIcon();
  if (config.modal) blockAuxiliaryParent(parent);
  const win = new BrowserWindow({
    title: auxiliaryKindTitle(request.kind),
    width: bounds.width,
    height: bounds.height,
    ...("x" in bounds && bounds.x != null && bounds.y != null ? { x: bounds.x, y: bounds.y } : {}),
    minWidth: config.minWidth,
    minHeight: config.minHeight,
    resizable: config.resizable,
    maximizable: config.resizable,
    fullscreenable: config.resizable,
    show: false,
    backgroundColor: standaloneBackground(),
    autoHideMenuBar: true,
    frame: isMac,
    parent: config.modal ? parent : undefined,
    modal: config.modal && isMac,
    ...(icon ? { icon } : {}),
    ...(isMac ? { titleBarStyle: "hidden" as const, trafficLightPosition: trafficLightPosition() } : {}),
    webPreferences: { ...sharedWebPrefs(), partition: PARTITION, backgroundThrottling: false },
  });
  if (!isMac) win.setMenuBarVisibility(false);
  if (config.modal && !isMac) win.setEnabled(true);
  applyTrafficLightPosition(win);
  const record: AuxiliaryRecord = {
    kind: request.kind,
    win,
    requestId: randomUUID(),
    payload: request.payload ?? null,
    modal: config.modal,
    resizable: config.resizable,
    settled: false,
    blockedParent: config.modal ? parent : null,
    waiters: [],
  };
  putAuxiliary(record);
  attachStandaloneFrame(win, {
    boundsKey: request.kind,
    minWidth: config.minWidth,
    minHeight: config.minHeight,
    rememberSize: config.resizable,
    escDismiss: config.modal,
    externalLinks: true,
  });
  bindCloseTabAccelerator(win);
  win.on("closed", () => {
    finishAuxiliary(record, "cancelled");
    unblockAuxiliaryParent(record.blockedParent);
    dropAuxiliary(record.kind, record);
  });
  publish(record);
  load(win);
  return waitFor(record);
}

export function releaseAuxiliaryResult(record: AuxiliaryRecord, status: AuxiliaryResult["status"], values?: unknown): void {
  finishAuxiliary(record, status, values);
}
