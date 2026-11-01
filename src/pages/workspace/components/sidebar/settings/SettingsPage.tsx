import type { ReactNode } from "react";
import { MessageSquare } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { WorkspaceViewActivity } from "../../WorkspaceViewActivity";
import type { SettingsTab } from "./types";
import { SETTINGS_TABS } from "../settings-dialog/shared";

export function SettingsPage({
  tab, visible, keepAlive, children,
}: {
  tab: SettingsTab;
  visible: boolean;
  keepAlive: boolean;
  children: ReactNode;
}) {
  return (
    <WorkspaceViewActivity visible={visible} keepAlive={keepAlive} className="settings-page-view">
      <section className="settings-tab-page" data-settings-tab={tab} aria-labelledby={`settings-page-${tab}`}>
        <div className="settings-scroll h-full overflow-y-auto">
          <div className="settings-panel min-h-0">
            <header className="settings-page-header">
              <h2 id={`settings-page-${tab}`} className={cn(
                "text-3xl font-semibold tracking-tight",
                tab === "feedback" && "inline-flex items-center gap-[0.65rem]",
              )}>
                {tab === "feedback" && <MessageSquare className="h-7 w-7 shrink-0" aria-hidden="true" />}
                {SETTINGS_TABS.find((item) => item.id === tab)?.label}
              </h2>
            </header>
            {children}
          </div>
        </div>
      </section>
    </WorkspaceViewActivity>
  );
}
