import type { BrowserWindow } from "electron";
import type {
  AuxiliaryKind,
  AuxiliaryResult,
  AuxiliaryWindowState,
} from "../../../../src/lib/auxiliary-window/contract";

export type AuxiliaryRecord = {
  kind: AuxiliaryKind;
  win: BrowserWindow;
  requestId: string;
  payload: unknown;
  modal: boolean;
  resizable: boolean;
  settled: boolean;
  blockedParent: BrowserWindow | null;
  waiters: Array<(result: AuxiliaryResult) => void>;
};

const live = new Map<AuxiliaryKind, AuxiliaryRecord>();
let modalBlocks = 0;

export function auxiliaryRecord(kind: AuxiliaryKind): AuxiliaryRecord | undefined {
  const record = live.get(kind);
  if (!record) return undefined;
  if (record.win.isDestroyed()) {
    live.delete(kind);
    return undefined;
  }
  return record;
}

export function findAuxiliaryWindow(win: BrowserWindow): AuxiliaryRecord | undefined {
  for (const record of live.values()) {
    if (record.win === win) return record.win.isDestroyed() ? undefined : record;
  }
  return undefined;
}

export function putAuxiliary(record: AuxiliaryRecord): void {
  live.set(record.kind, record);
}

export function dropAuxiliary(kind: AuxiliaryKind, record: AuxiliaryRecord): void {
  if (live.get(kind) === record) live.delete(kind);
}

export function auxiliaryState(record: AuxiliaryRecord): AuxiliaryWindowState {
  return {
    kind: record.kind,
    requestId: record.requestId,
    payload: record.payload,
    modal: record.modal,
    resizable: record.resizable,
  };
}

export function blockAuxiliaryParent(parent: BrowserWindow): void {
  if (process.platform === "darwin" || parent.isDestroyed()) return;
  modalBlocks += 1;
  parent.setEnabled(false);
}

export function unblockAuxiliaryParent(parent: BrowserWindow | null): void {
  if (process.platform === "darwin" || !parent) return;
  modalBlocks = Math.max(0, modalBlocks - 1);
  if (modalBlocks === 0 && !parent.isDestroyed()) parent.setEnabled(true);
}

export function finishAuxiliary(
  record: AuxiliaryRecord,
  status: "confirmed" | "cancelled",
  values?: unknown,
): AuxiliaryResult | null {
  if (record.settled) return null;
  record.settled = true;
  const result: AuxiliaryResult = {
    kind: record.kind,
    requestId: record.requestId,
    status,
    ...(values === undefined ? {} : { values }),
  };
  const waiters = record.waiters.splice(0);
  for (const waiter of waiters) waiter(result);
  return result;
}
