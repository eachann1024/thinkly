import { createStore } from "zustand/vanilla";
import { shallow } from "zustand/shallow";
import type { NotebookAiMessage } from "@/lib/notebook-ai/types";
import type { NotebookAiSessionCommands, NotebookAiSessionSnapshot, NotebookAiSessionValue } from "./types";

export interface NotebookAiSessionPublication {
  session: NotebookAiSessionValue | null;
  commands: NotebookAiSessionCommands | null;
  messages: NotebookAiMessage[];
}

export function createNotebookAiSessionPublication() {
  const empty: NotebookAiSessionPublication = { session: null, commands: null, messages: [] };
  const store = createStore<NotebookAiSessionPublication>(() => empty);
  return {
    store,
    publish(value: NotebookAiSessionSnapshot) {
      const { messages, commands, ...session } = value;
      store.setState((previous) => ({
        session: shallow(previous.session, session) ? previous.session : session,
        commands,
        messages,
      }));
    },
    clear() {
      store.setState(empty, true);
    },
  };
}
