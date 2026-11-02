import { useMemo } from "react";
import { useStableCallback } from "../useStableCallback";
import type { NotebookAiSessionValue } from "./types";

type Commands = Pick<NotebookAiSessionValue,
  "clearError" | "stop" | "send" | "newConversation" | "ensureFreshConversation" |
  "compactConversation" | "selectConversation" | "deleteConversation" |
  "searchPages" | "onBatchApproval" | "onBatchUndo">;

export function useSessionCommands(commands: Commands): Commands {
  const clearError = useStableCallback(commands.clearError);
  const stop = useStableCallback(commands.stop);
  const send = useStableCallback(commands.send);
  const newConversation = useStableCallback(commands.newConversation);
  const ensureFreshConversation = useStableCallback(commands.ensureFreshConversation);
  const compactConversation = useStableCallback(commands.compactConversation);
  const selectConversation = useStableCallback(commands.selectConversation);
  const deleteConversation = useStableCallback(commands.deleteConversation);
  const searchPages = useStableCallback(commands.searchPages);
  const onBatchApproval = useStableCallback(commands.onBatchApproval);
  const onBatchUndo = useStableCallback(commands.onBatchUndo);
  return useMemo(() => ({
    clearError, stop, send, newConversation, ensureFreshConversation,
    compactConversation, selectConversation, deleteConversation, searchPages,
    onBatchApproval, onBatchUndo,
  }), [clearError, stop, send, newConversation, ensureFreshConversation,
    compactConversation, selectConversation, deleteConversation, searchPages,
    onBatchApproval, onBatchUndo]);
}
