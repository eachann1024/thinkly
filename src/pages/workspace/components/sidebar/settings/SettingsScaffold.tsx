import { IconButton } from "@/components/ui/icon-button";
import { NativeSelect } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { X } from "@/components/ui/icons";
import { useWorkspaceViewport } from "@/stores/useWorkspaceViewport";
import type { SettingsTab, SettingsTabConfig } from "./types";
import { cn } from "@/lib/utils";
import "./settings-layout.css";
import "./settings-compact.css";

interface SettingsScaffoldProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  onClose: () => void;
  tabs: SettingsTabConfig[];
  sidebarContainer: HTMLElement | null;
  mainContainer: HTMLElement | null;
  visible: boolean;
  children: ReactNode;
  feedbackBanner?: ReactNode;
  appsBanner?: ReactNode;
}

export function SettingsScaffold({
  activeTab,
  onTabChange,
  onClose,
  tabs,
  sidebarContainer,
  mainContainer,
  visible,
  children,
  feedbackBanner,
  appsBanner,
}: SettingsScaffoldProps) {
  const compact = useWorkspaceViewport((s) => s.forceCollapseLeft);
  const compactNavigationRef = useRef<HTMLSelectElement>(null);
  const navigationRef = useRef<HTMLDivElement | null>(null);
  const wasVisibleRef = useRef(false);
  useLayoutEffect(() => {
    if (visible && !wasVisibleRef.current) {
      if (compact) compactNavigationRef.current?.focus({ preventScroll: true });
      else
        navigationRef.current
          ?.querySelector<HTMLElement>('button[aria-current="page"]')
          ?.focus({ preventScroll: true });
    }
    wasVisibleRef.current = visible;
  }, [visible, sidebarContainer, compact]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionsRef = useRef<Partial<Record<SettingsTab, number>>>({});
  const previousActiveTabRef = useRef<SettingsTab>(activeTab);

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const previousActiveTab = previousActiveTabRef.current;
    if (!scrollContainer || previousActiveTab === activeTab) return;
    scrollPositionsRef.current[previousActiveTab] = scrollContainer.scrollTop;
    scrollContainer.scrollTop = scrollPositionsRef.current[activeTab] ?? 0;
    previousActiveTabRef.current = activeTab;
  }, [activeTab]);

  const handleTabChange = (tab: SettingsTab) => {
    if (scrollContainerRef.current) {
      scrollPositionsRef.current[activeTab] =
        scrollContainerRef.current.scrollTop;
    }
    onTabChange(tab);
  };

  return (
    <>
      {sidebarContainer &&
        createPortal(
          <div
            ref={navigationRef}
            className="settings-sidebar-navigation flex h-full min-h-0 flex-col px-1.5 py-4 text-foreground"
            data-settings-navigation=""
            hidden={!visible}
            inert={!visible}
            aria-hidden={!visible}
          >
            <div className="flex shrink-0 items-center px-2 pb-4">
              <h1 className="text-xl font-semibold">设置</h1>
            </div>
            <nav
              aria-label="设置分类"
              className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button contentStyle="preserve" variant="ghost" size="sm"
                    key={tab.id}
                    type="button"
                    aria-current={activeTab === tab.id ? "page" : undefined}
                    data-selected={activeTab === tab.id || undefined}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      "goose-list-row h-auto border-0 inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-left text-sm",
                      activeTab !== tab.id && "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{tab.label}</span>
                  </Button>
                );
              })}
            </nav>
          </div>,
          sidebarContainer,
        )}
      {mainContainer &&
        createPortal(
          <div
            className="settings-shell absolute inset-0 flex h-full min-h-0 flex-col text-foreground"
            hidden={!visible}
            inert={!visible}
            aria-hidden={!visible}
            data-settings=""
            data-settings-tab={activeTab}
          >
            <nav className="settings-compact-navigation" aria-label="设置分类">
              <span className="text-sm font-medium">设置</span>
              <NativeSelect controlSize="compact"
                ref={compactNavigationRef}
                aria-label="设置分类"
                value={activeTab}
                onChange={(event) =>
                  handleTabChange(event.target.value as SettingsTab)
                }
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </NativeSelect>
            </nav>
            <IconButton size="xs"
              type="button"
              className="p-0 settings-close absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[var(--goose-interactive-hover)] hover:text-[var(--goose-interactive-hover-fg)]"
              aria-label="关闭设置"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </IconButton>
            <div className="min-h-0 flex-1 bg-[hsl(var(--goose-settings-bg))]">
              <div
                ref={scrollContainerRef}
                onScroll={(event) => {
                  scrollPositionsRef.current[activeTab] =
                    event.currentTarget.scrollTop;
                }}
                className="settings-scroll h-full overflow-y-auto"
              >
                <div className="settings-panel min-h-0">
                  <header className="settings-page-header">
                    <h2 className="text-3xl font-semibold tracking-tight">
                      {tabs.find((tab) => tab.id === activeTab)?.label}
                    </h2>
                    {feedbackBanner || appsBanner ? (
                      <div className="mt-6">
                        {feedbackBanner}
                        {appsBanner}
                      </div>
                    ) : null}
                  </header>
                  {children}
                </div>
              </div>
            </div>
          </div>,
          mainContainer,
        )}
    </>
  );
}
