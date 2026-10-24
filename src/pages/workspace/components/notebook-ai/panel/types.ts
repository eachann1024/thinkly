import type { RefObject } from "react";
import type { EditorRef } from "@/components/editor/core/Editor";
import type {
  NotebookAiLayoutMode,
  NotebookAiPanelSelectionCapture,
} from "../useNotebookAiPanel";
export interface NotebookAiPanelProps {
  notebookId: string;
  onClose: () => void;
  editorRef?: RefObject<EditorRef | null>;
  capturedSelection?: NotebookAiPanelSelectionCapture | null;
  onConsumeCapturedSelection?: () => void;
  layoutMode?: NotebookAiLayoutMode;
  onLayoutModeChange?: (mode: NotebookAiLayoutMode) => void;
  variant?: "side-panel" | "fullscreen";
}
