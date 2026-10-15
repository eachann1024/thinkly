import type { StoreSet, StoreGet } from "../hydrate";
import type { Page } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { useNotebooks } from "@/stores/useNotebooks";
import { useSettings } from "@/stores/useSettings";
import { pickRandomPageIcon } from "@/lib/randomPageIcon";
import { cloneLocalPageContent } from "./content";

/** 只登记编辑器草稿；不落库、不切页，调用方成功放入分屏后再激活。 */
export function createEditorDraftPageAction(
  set: StoreSet,
  get: StoreGet,
  sourcePageId: string,
): string {
  const source = get().pages[sourcePageId];
  if (!source || source.isFolder || source.trashedAt) return "";
  const notebook = useNotebooks.getState().notebooks[source.workspaceId];
  if (notebook?.source !== "local-folder") return "";
  const now = Date.now();
  const id = uuidv4();
  const page: Page = {
    id,
    workspaceId: source.workspaceId,
    parentId: source.parentId,
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
