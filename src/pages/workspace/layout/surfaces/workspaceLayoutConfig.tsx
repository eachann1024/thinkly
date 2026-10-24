import { type RefObject } from "react";
import { type EditorRef } from "@/components/editor/core/Editor";
import { isElectronRuntime } from "@/lib/electron/runtime";

export // Electron 桌面端 chrome：全宽顶栏挂在 .workspace-shell 顶部。
// 普通页面的页头只在顶栏；历史模式的两栏表头在侧栏和正文里，顶栏不再盖住历史栏。
const isElectronChrome = isElectronRuntime();

export interface WorkspaceLayoutProps {
  isDragging: boolean;
  dragIntent: "folder" | "text-file" | "file" | "editor" | "sidebar" | "rejected" | "pending";
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => Promise<void>;
  editorRef: RefObject<EditorRef | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}
