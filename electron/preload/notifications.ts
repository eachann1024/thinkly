import { ipcRenderer } from "electron";
import { NOTIFICATION_ACTION_CHANNEL, type NotificationDelivery } from "../../src/lib/notification-action";
import type { SettingsTab } from "../../src/pages/workspace/components/sidebar/settings/types";
import { invoke } from "./services";

export const notifications = {
  openSettings: (tab: SettingsTab) => invoke("desktop:open-settings", tab) as Promise<boolean>,
  onNotificationAction: (callback: (delivery: NotificationDelivery) => void) => {
    const listener = (_event: unknown, delivery: NotificationDelivery) => callback(delivery);
    ipcRenderer.on(NOTIFICATION_ACTION_CHANNEL, listener);
    return () => ipcRenderer.removeListener(NOTIFICATION_ACTION_CHANNEL, listener);
  },
  notificationReady: () => invoke("desktop:notification-ready") as Promise<NotificationDelivery | null>,
  notificationHandled: (sequence: number) => invoke("desktop:notification-handled", sequence) as Promise<boolean>,
};
