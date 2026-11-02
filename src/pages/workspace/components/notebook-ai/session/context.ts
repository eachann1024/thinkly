import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { createNotebookAiSessionPublication, type NotebookAiSessionPublication } from "./publication";
import type { NotebookAiSessionValue } from "./types";

export const NotebookAiSessionContext =
  createContext(createNotebookAiSessionPublication().store);
export const NotebookAiPanelVisibilityContext = createContext<boolean | null>(null);

function useSessionSelector<T>(selector: (state: NotebookAiSessionPublication) => T): T {
  const store = useContext(NotebookAiSessionContext);
  return useStore(store, selector);
}

export function useNotebookAiSessionReady() {
  return useSessionSelector((state) => state.session !== null);
}

export function useNotebookAiSession(): NotebookAiSessionValue {
  const session = useSessionSelector((state) => state.session);
  if (!session) {
    throw new Error("useNotebookAiSession 必须在 NotebookAiSessionProvider 内使用");
  }
  return session;
}

export function useNotebookAiCommands() {
  const commands = useSessionSelector((state) => state.commands);
  if (!commands) {
    throw new Error("useNotebookAiCommands 必须在 NotebookAiSessionProvider 内使用");
  }
  return commands;
}

export function useNotebookAiMessages() {
  return useSessionSelector((state) => state.messages);
}

export function useNotebookAiFirstUserMessage() {
  return useSessionSelector((state) => state.messages.find((message) => message.role === "user"));
}
