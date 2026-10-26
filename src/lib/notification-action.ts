import type { SettingsTab } from "@/pages/workspace/components/sidebar/settings/types";

export type NotificationAction =
  | { type: "settings"; tab: SettingsTab; repositoryId?: string }
  | { type: "workspace" };
export type NotificationDelivery = { sequence: number; action: NotificationAction };
export const NOTIFICATION_ACTION_CHANNEL = "desktop:notification-action";

export function parseNotificationAction(value: unknown): NotificationAction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (item.type === "workspace") return { type: "workspace" };
  if (item.type !== "settings" || typeof item.tab !== "string" ||
    !["appearance", "general", "shortcuts", "local-folder", "git-sync", "ai", "data", "feedback"].includes(item.tab)) return null;
  if (item.repositoryId !== undefined && (item.tab !== "git-sync" || typeof item.repositoryId !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(item.repositoryId) || Object.prototype.hasOwnProperty.call(Object.prototype, item.repositoryId))) return null;
  return { type: "settings", tab: item.tab as SettingsTab,
    ...(typeof item.repositoryId === "string" ? { repositoryId: item.repositoryId } : {}) };
}

/** Last click wins while a renderer is mounting; no timers or persisted user data. */
export class NotificationMailbox {
  private sequence = 0;
  private pending = new Map<number, NotificationDelivery>();
  enqueue(windowId: number, action: NotificationAction): NotificationDelivery {
    const delivery = { sequence: ++this.sequence, action };
    this.pending.delete(windowId);
    this.pending.set(windowId, delivery);
    while (this.pending.size > 32) this.pending.delete(this.pending.keys().next().value!);
    return delivery;
  }
  peek(windowId: number): NotificationDelivery | null { return this.pending.get(windowId) ?? null; }
  acknowledge(windowId: number, sequence: number): boolean {
    if (this.pending.get(windowId)?.sequence !== sequence) return false;
    return this.pending.delete(windowId);
  }
  clear(windowId: number): void { this.pending.delete(windowId); }
}
