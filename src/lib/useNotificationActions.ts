import { useEffect, useLayoutEffect, useRef } from "react";
import { parseNotificationAction, type NotificationDelivery } from "./notification-action";
import type { SettingsTab } from "@/pages/workspace/components/sidebar/settings/types";
import { useNotificationDestination } from "@/stores/useNotificationDestination";

let lastSequence = 0;
export function listenForNotificationActions(
  desktop: Pick<GooseDesktop, "onNotificationAction" | "notificationReady" | "notificationHandled"> | undefined,
  openSettings: (tab?: SettingsTab) => void,
): () => void {
    if (!desktop?.onNotificationAction || !desktop.notificationReady || !desktop.notificationHandled) return () => {};
    let mounted = true;
    const receive = (delivery: NotificationDelivery | null) => {
      if (!mounted || !delivery || !Number.isSafeInteger(delivery.sequence) || delivery.sequence < 1) return;
      const action = parseNotificationAction(delivery.action);
      if (!action) return;
      if (delivery.sequence > lastSequence) {
        if (action.type === "settings") {
          useNotificationDestination.getState().selectRepository(action.repositoryId ?? null);
          openSettings(action.tab);
        }
        lastSequence = delivery.sequence;
      }
      void desktop.notificationHandled(delivery.sequence).catch((error: unknown) => console.error("[notifications] acknowledgement failed", error));
    };
    const unsubscribe = desktop.onNotificationAction(receive);
    void desktop.notificationReady().then(receive).catch((error: unknown) => console.error("[notifications] readiness failed", error));
    return () => { mounted = false; unsubscribe(); };
}

export function useNotificationActions(openSettings: (tab?: SettingsTab) => void): void {
  const latestOpen = useRef(openSettings);
  useLayoutEffect(() => { latestOpen.current = openSettings; }, [openSettings]);
  useEffect(() => listenForNotificationActions(window.gooseDesktop, (tab) => latestOpen.current(tab)), []);
}
