import type { Page } from "@/types";
import type { NotebookAiLayoutMode } from "../../notebook-ai/useNotebookAiPanel";

export interface DesktopTitleBarProps {
  page?: Page;
  settingsOpen?: boolean;
  sidebarCollapsedOverride?: boolean;
  onToggleSidebar?: () => void;
  isWelcomeTab: boolean;
  inHistoryMode: boolean;
  onOpenSearch: () => void;
  onBeforeActivateTab?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  aiPanelOpen?: boolean;
  aiLayoutMode?: NotebookAiLayoutMode;
  onToggleAiPanel?: () => void;
}
