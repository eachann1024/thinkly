import { BrowserWindow, ipcMain, Notification, type WebContents } from "electron";
import { NOTIFICATION_ACTION_CHANNEL, NotificationMailbox, parseNotificationAction, type NotificationAction } from "../../src/lib/notification-action";
import { lookupWindowContext, showOrCreateMainWindow } from "./windows";
import { raiseWindow } from "./windows/activation";

const mailbox = new NotificationMailbox();
const ready = new WeakSet<WebContents>();
const tracked = new WeakSet<WebContents>();
type ActiveNotification = { notification: Notification; onUnavailable?: () => void };
const active = new Map<string, ActiveNotification>();
let nextId = 0;

function track(contents: WebContents) {
  if (tracked.has(contents)) return;
  tracked.add(contents);
  contents.on("did-start-navigation", (_event, _url, inPlace, mainFrame) => {
    if (mainFrame && !inPlace) ready.delete(contents);
  });
  const id = contents.id;
  contents.once("destroyed", () => { mailbox.clear(id); ready.delete(contents); });
}

function navigate(action: NotificationAction, preferred?: BrowserWindow | null): boolean {
  const source = preferred && lookupWindowContext(preferred)?.kind === "workspace" ? preferred : null;
  const win = source ?? showOrCreateMainWindow();
  if (win.isDestroyed() || win.webContents.isDestroyed()) return false;
  if (source) raiseWindow(win);
  const contents = win.webContents;
  track(contents);
  mailbox.enqueue(contents.id, action);
  if (ready.has(contents)) {
    const delivery = mailbox.peek(contents.id);
    if (delivery) contents.send(NOTIFICATION_ACTION_CHANNEL, delivery);
  }
  return true;
}

export function showActionableNotification(
  message: { title: string; body: string },
  action: NotificationAction = { type: "workspace" },
  preferred?: BrowserWindow | null,
  key = `notification:${++nextId}`,
  onFailure?: () => void,
): boolean {
  if (!Notification.isSupported()) return false;
  active.get(key)?.notification.close();
  const notification = new Notification({ title: message.title.slice(0, 200), body: message.body.slice(0, 400) });
  const entry: ActiveNotification = { notification, onUnavailable: onFailure };
  const release = () => { if (active.get(key) === entry) active.delete(key); };
  const fail = () => {
    const isCurrent = active.get(key) === entry;
    release();
    if (isCurrent) entry.onUnavailable?.();
  };
  notification.once("click", () => { release(); navigate(action, preferred); });
  notification.once("close", release);
  notification.once("failed", fail);
  active.delete(key);
  active.set(key, entry);
  while (active.size > 32) {
    const [oldKey, old] = active.entries().next().value!;
    const isCurrent = active.get(oldKey) === old;
    active.delete(oldKey);
    try {
      if (isCurrent) old.onUnavailable?.();
    } catch (error) {
      console.error("[notifications] eviction callback failed", error);
    } finally {
      old.notification.close();
    }
  }
  try { notification.show(); return active.get(key) === entry; }
  catch { release(); return false; }
}

export function clearActionableNotification(key: string): void {
  const notification = active.get(key)?.notification;
  active.delete(key);
  notification?.close();
}

export function registerNotificationIpc(): void {
  ipcMain.handle("desktop:open-settings", (event, tab: unknown) => {
    if (event.senderFrame !== event.sender.mainFrame) return false;
    const source = BrowserWindow.fromWebContents(event.sender);
    const kind = lookupWindowContext(source)?.kind;
    if (kind !== "workspace" && kind !== "quicknote" && kind !== "search") return false;
    const action = parseNotificationAction({ type: "settings", tab });
    if (!action || action.type !== "settings") return false;
    try {
      return navigate(action, kind === "workspace" ? source : null);
    } catch (error) {
      console.error("[notifications] settings navigation failed", error);
      return false;
    }
  });
  ipcMain.handle("desktop:notification-ready", (event) => {
    if (event.senderFrame !== event.sender.mainFrame || lookupWindowContext(BrowserWindow.fromWebContents(event.sender))?.kind !== "workspace") return null;
    track(event.sender);
    ready.add(event.sender);
    return mailbox.peek(event.sender.id);
  });
  ipcMain.handle("desktop:notification-handled", (event, sequence: unknown) => {
    if (event.senderFrame !== event.sender.mainFrame || lookupWindowContext(BrowserWindow.fromWebContents(event.sender))?.kind !== "workspace" || !Number.isSafeInteger(sequence)) return false;
    return mailbox.acknowledge(event.sender.id, sequence as number);
  });
}
