import { ipcRenderer } from "electron";
import {
  SEARCH_AI_SETTINGS_PUBLISH_CHANNEL,
  SEARCH_AI_SETTINGS_PUSH_CHANNEL,
} from "../../src/lib/electron/searchAISettings";
import {
  OPEN_SEARCH_RESULT_CHANNEL,
  SEARCH_WINDOW_COMMAND_CHANNEL,
  SEARCH_WINDOW_SHOWN_CHANNEL,
  parseSearchWindowCommand,
  type OpenSearchResultPayload,
  type SearchWindowCommand,
} from "../../src/lib/electron/searchWindow";

let pendingSearchResult: OpenSearchResultPayload | null = null;
const subscribers = new Set<(payload: OpenSearchResultPayload) => void>();

function deliverPending(): void {
  const payload = pendingSearchResult;
  const [first] = subscribers;
  if (!payload || !first) return;
  pendingSearchResult = null;
  first(payload);
}

ipcRenderer.on(OPEN_SEARCH_RESULT_CHANNEL, (_event, payload: OpenSearchResultPayload) => {
  pendingSearchResult = payload;
  deliverPending();
});

let pendingCommands: SearchWindowCommand[] = [];
const commandSubscribers = new Set<(command: SearchWindowCommand) => void>();

function deliverCommands(): void {
  const [first] = commandSubscribers;
  if (!first || pendingCommands.length === 0) return;
  const batch = pendingCommands;
  pendingCommands = [];
  for (const command of batch) first(command);
}

ipcRenderer.on(SEARCH_WINDOW_COMMAND_CHANNEL, (_event, payload: unknown) => {
  const command = parseSearchWindowCommand(payload);
  if (!command) return;
  pendingCommands.push(command);
  deliverCommands();
});

export const searchWindow = {
  hideSearchWindow: () => ipcRenderer.invoke("desktop:hideSearchWindow") as Promise<void>,
  searchWindowReady: () => ipcRenderer.invoke("desktop:searchWindowReady") as Promise<void>,
  openSearchResult: (payload: OpenSearchResultPayload) =>
    ipcRenderer.invoke("desktop:openSearchResult", payload) as Promise<boolean>,
  onSearchWindowShown: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on(SEARCH_WINDOW_SHOWN_CHANNEL, listener);
    return () => {
      ipcRenderer.removeListener(SEARCH_WINDOW_SHOWN_CHANNEL, listener);
    };
  },
  onOpenSearchResult: (cb: (payload: OpenSearchResultPayload) => void) => {
    subscribers.add(cb);
    queueMicrotask(deliverPending);
    return () => {
      subscribers.delete(cb);
    };
  },
  searchWindowCommand: (command: SearchWindowCommand) =>
    ipcRenderer.invoke("desktop:searchWindowCommand", command) as Promise<boolean>,
  pullWorkspaceAISettings: () =>
    ipcRenderer.invoke("desktop:pullWorkspaceAISettings") as Promise<unknown>,
  publishWorkspaceAISettings: (settings: unknown) => {
    ipcRenderer.send(SEARCH_AI_SETTINGS_PUBLISH_CHANNEL, settings);
  },
  onWorkspaceAISettings: (cb: (settings: unknown) => void) => {
    const listener = (_event: unknown, settings: unknown) => cb(settings);
    ipcRenderer.on(SEARCH_AI_SETTINGS_PUSH_CHANNEL, listener);
    return () => {
      ipcRenderer.removeListener(SEARCH_AI_SETTINGS_PUSH_CHANNEL, listener);
    };
  },
  onSearchWindowCommand: (cb: (command: SearchWindowCommand) => void) => {
    commandSubscribers.add(cb);
    queueMicrotask(deliverCommands);
    return () => {
      commandSubscribers.delete(cb);
    };
  },
};
