import type { StoreSet, StoreGet } from "../hydrate";
import type { Page } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { useNotebooks } from "@/stores/useNotebooks";
import { useSettings } from "@/stores/useSettings";
import { pickRandomPageIcon } from "@/lib/randomPageIcon";
import { cloneLocalPageContent } from "./content";

export function createEditorDraftPageAction(
  set: StoreSet,
  get: StoreGet,
  sourcePageId: string | null,
  workspaceId?: string,
): string {
  const source = sourcePageId ? get().pages[sourcePageId] : undefined;
  if (sourcePageId && (!source || source.isFolder || source.trashedAt)) return "";
  const targetWorkspaceId = source?.workspaceId ?? workspaceId;
  if (!targetWorkspaceId) return "";
  const notebook = useNotebooks.getState().notebooks[targetWorkspaceId];
  if (notebook?.source !== "local-folder") return "";
  const now = Date.now();
  const id = uuidv4();
  const page: Page = {
    id,
    workspaceId: targetWorkspaceId,
    parentId: source?.parentId,
    content: cloneLocalPageContent(),
    editorDraft: true,
    localUnsaved: true,
    isFolder: false,
    isLocked: false,
    fontSize: "default",
    fontFamily: "default",
    createdAt: now,
    updatedAt: now,
    order: now,
    ...(useSettings.getState().randomIconOnCreate ? { icon: pickRandomPageIcon() } : {}),
  };
  set((state) => ({ pages: { ...state.pages, [id]: page } }));
  return id;
}
