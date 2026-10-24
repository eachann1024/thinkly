import { type RefObject } from "react";
import { type EditorRef } from "@/components/editor/core/Editor";
import { isElectronRuntime } from "@/lib/electron/runtime";

export
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
