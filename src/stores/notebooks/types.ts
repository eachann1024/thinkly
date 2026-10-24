export interface Notebook {
  id: string;
  name: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
  order?: number;
  source?: "default" | "local-folder";
  localPath?: string;
  localPathMissing?: boolean;
  excludeFromGlobalSearch?: boolean;
}

export function sortNotebooksByOrder(
  notebooks: Record<string, Notebook>,
): Notebook[] {
  return Object.values(notebooks).sort((a, b) => {
    const orderA = a.order ?? a.createdAt;
    const orderB = b.order ?? b.createdAt;
    if (orderA !== orderB) return orderA - orderB;
    return a.createdAt - b.createdAt;
  });
}

export function nextNotebookOrder(notebooks: Record<string, Notebook>): number {
  const list = Object.values(notebooks);
  if (list.length === 0) return 0;
  return Math.max(...list.map((n) => n.order ?? n.createdAt)) + 1;
}

export { IDLE_LOCAL_FOLDER_LOAD_STATE } from "./localFolderLoadState";
export type { LocalFolderLoadState, LocalFolderLoadStatus } from "./localFolderLoadState";
import type { LocalFolderLoadState, LocalFolderLoadEvent } from "./localFolderLoadState";

export interface NotebooksState {
  notebooks: Record<string, Notebook>;
  activeNotebookId: string | null;
  lastActivePageByNotebook: Record<string, string | null>;
  localFolderLoadStates: Record<string, LocalFolderLoadState>;

  createNotebook: (
    name?: string,
    icon?: string,
    overrideIfExists?: boolean,
    customId?: string,
  ) => string;
  createLocalFolderNotebook: (name: string, localPath: string) => string;
  updateNotebook: (
    id: string,
    updates: Partial<Omit<Notebook, "id" | "createdAt">>,
  ) => void;
  deleteNotebook: (id: string) => void;
  reorderNotebooks: (orderedIds: string[]) => void;
  setActiveNotebook: (id: string) => void;
  getNotebook: (id: string) => Notebook | undefined;
  setLastActivePage: (notebookId: string, pageId: string | null) => void;
  getLastActivePage: (notebookId: string) => string | null;
  dispatchLocalFolderLoadEvent: (
    notebookId: string,
    event: LocalFolderLoadEvent,
  ) => void;
  getLocalFolderLoadState: (notebookId: string) => LocalFolderLoadState;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export const DEFAULT_NOTEBOOK_ID = "default-notebook";

export const DEFAULT_NOTEBOOK = DEFAULT_NOTEBOOK_ID;
