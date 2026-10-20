import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/SettingsScaffold.tsx#localMessages:1">`
zh-Hans:
  settings_e366: "设置"
  settingsCategories_2590: "设置分类"
  closeSettings_c252: "关闭设置"
en:
  settings_e366: "Settings"
  settingsCategories_2590: "Settings categories"
  closeSettings_c252: "Close settings"
ja:
  settings_e366: "設定"
  settingsCategories_2590: "設定カテゴリ"
  closeSettings_c252: "設定を閉じる"
`;
const uiText = createTranslator(localMessages);
import { IconButton } from "@/components/ui/icon-button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { X, ChevronDown, MessageSquare } from "@/components/ui/icons";
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
}: SettingsScaffoldProps) {
  useLocale();
  const compact = useWorkspaceViewport((s) => s.forceCollapseLeft);
  const compactNavigationRef = useRef<HTMLButtonElement>(null);
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
  const [navSheen, setNavSheen] = useState(false);
  const [titleSheen, setTitleSheen] = useState(false);
  useEffect(() => {
    setNavSheen(false);
    setTitleSheen(false);
    if (!visible) return;
    const start = window.setTimeout(() => {
      setNavSheen(true);
      setTitleSheen(activeTab === "feedback");
    }, 500);
    const end = window.setTimeout(() => {
      setNavSheen(false);
      setTitleSheen(false);
    }, 3500);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(end);
    };
  }, [visible, activeTab === "feedback"]);

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
            className="settings-sidebar-navigation flex h-full min-h-0 flex-col px-3 py-5 text-foreground"
            data-settings-navigation=""
            hidden={!visible}
            inert={!visible}
            aria-hidden={!visible}
          >
            <div className="flex shrink-0 items-center px-2 pb-4">
              <h1 className="text-xl font-semibold tracking-[-0.01em]">{uiText("settings_e366")}</h1>
            </div>
            <nav
              aria-label={uiText("settingsCategories_2590")}
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
                    data-settings-tab={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      "goose-list-row goose-accent-selection h-auto border-0 inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-left text-sm",
                      activeTab !== tab.id && "text-muted-foreground",
                      tab.id === "feedback" && "feedback-sheen-target",
                      tab.id === "feedback" && navSheen && "is-on",
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
            <nav className="settings-compact-navigation" aria-label={uiText("settingsCategories_2590")}>
              <span className="text-sm font-medium">{uiText("settings_e366")}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button ref={compactNavigationRef} variant="outline" size="sm" aria-label={uiText("settingsCategories_2590")} className="min-w-0 flex-1 justify-between">
                    <span className="truncate">{tabs.find((tab) => tab.id === activeTab)?.label}</span>
                    <ChevronDown aria-hidden="true" className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuRadioGroup value={activeTab} onValueChange={(value) => handleTabChange(value as SettingsTab)}>
                    {tabs.map((tab) => <DropdownMenuRadioItem key={tab.id} value={tab.id}>{tab.label}</DropdownMenuRadioItem>)}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
            <IconButton size="xs"
              type="button"
              className="p-0 settings-close absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[var(--goose-interactive-hover)] hover:text-[var(--goose-interactive-hover-fg)]"
              aria-label={uiText("closeSettings_c252")}
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
                    <h2 className={cn(
                      "text-3xl font-semibold tracking-tight",
                      activeTab === "feedback" && "feedback-sheen-title",
                      activeTab === "feedback" && titleSheen && "is-on",
                    )}>
                      {activeTab === "feedback" ? <MessageSquare className="h-7 w-7 shrink-0" aria-hidden="true" /> : null}
                      {tabs.find((tab) => tab.id === activeTab)?.label}
                    </h2>
                    {feedbackBanner ? (
                      <div className="mt-6">
                        {feedbackBanner}
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
