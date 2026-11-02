import type { ReactNode } from "react";
import { NotebookAiAssistantRuntimeProvider } from "../AssistantUiRuntimeProvider";
import { useNotebookAiMessages, useNotebookAiSession } from "./context";

export function NotebookAiRuntimeScope({ children }: { children: ReactNode }) {
  const messages = useNotebookAiMessages();
  const { isBusy, unavailableReason, stop } = useNotebookAiSession();
  return (
    <NotebookAiAssistantRuntimeProvider
      messages={messages}
      isRunning={isBusy}
      isDisabled={Boolean(unavailableReason)}
      onCancel={stop}
    >
      {children}
    </NotebookAiAssistantRuntimeProvider>
  );
}
