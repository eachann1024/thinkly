import { deferredComponent } from "@/lib/deferredComponent";
import type { ComponentProps } from "react";
import type { NotebookAiSessionBinder } from "./NotebookAiSessionBinder";
import type { NotebookAiPanelProps } from "./panel/types";

export const notebookAiSession = deferredComponent<ComponentProps<typeof NotebookAiSessionBinder>>(() =>
  import("./NotebookAiSessionBinder").then((module) => ({ default: module.NotebookAiSessionBinder })),
);

export const notebookAiPanel = deferredComponent<NotebookAiPanelProps>(() =>
  import("./NotebookAiPanel").then((module) => ({ default: module.NotebookAiPanel })),
);

export function preloadNotebookAi(): void {
  void Promise.all([notebookAiSession.load(), notebookAiPanel.load()]).catch((error: unknown) => {
    console.error("AI panel preload failed", error);
  });
}
