import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/actions/create/duplicate.ts#block1:1">`
zh-Hans:
  invalidFrontmatterCopy: "YAML 前置区格式异常，未创建副本"
en:
  invalidFrontmatterCopy: "The YAML frontmatter is invalid. No copy was created."
ja:
  invalidFrontmatterCopy: "YAML フロントマターの形式が正しくないため、複製を作成できませんでした"
`);
import type { StoreSet, StoreGet } from "../hydrate";
import { flushEditorContent } from "../flushEditor";
import { useNotebooks } from "../../../useNotebooks";
import { mergeLocalPageSettingsIntoFrontmatter } from "@/lib/local-frontmatter";
import { toast } from "@/components/ui/sonner";
import { cloneLocalPageContent } from "./content";
import { readLocalPageIdMap, toRelativePath, writeLocalPageIdMap } from "@/lib/local-page-idmap";
import type { Page } from "@/types";
import { persistPageSnapshot } from "../../persistence";
import { v4 as uuidv4 } from "uuid";
import { extractTitleFromContent } from "@/components/editor/utils/content-text-extractor";
import { preserveLocalEditorDraft } from "./recovery";
import { queueLocalPageCreation } from "./localCreationQueue";
import { appendLocalFolderOrderEntries } from "@/stores/localFolderOrder";

export const duplicatePageAction = async (
  set: StoreSet,
  get: StoreGet,
  id: string,
): Promise<string> => {
  flushEditorContent();

  const sourcePage = get().pages[id];
  if (!sourcePage) return id;

  const notebook = useNotebooks.getState().notebooks[sourcePage.workspaceId];
  if (notebook?.source === "local-folder") {
    if (sourcePage.isFolder || !sourcePage.localFilePath) {
      return id;
    }
    const fs = window.gooseFs;
    if (!fs) return id;

    return queueLocalPageCreation(notebook.id, async () => {
      const source = get().pages[id];
      if (!source || source.localReadState === "error" || !source.localFilePath) return id;
      const sourcePath = source.localFilePath.replace(/\\/g, "/");
      const slash = sourcePath.lastIndexOf("/");
      const directory = sourcePath.slice(0, slash);
      const fileName = sourcePath.slice(slash + 1);
      const dot = fileName.lastIndexOf(".");
      const baseName = dot > 0 ? fileName.slice(0, dot) : fileName;
      const extension = dot > 0 ? fileName.slice(dot) : ".md";
      let suffix = 1;
      let candidatePath: string;
      do {
        candidatePath = `${directory}/${baseName}_副本${suffix === 1 ? "" : ` ${suffix}`}${extension}`;
        const occupied = Object.values(get().pages).some((page) =>
          page.localFilePath?.replace(/\\/g, "/") === candidatePath);
        const exists = occupied || await (fs.existsAsync ? fs.existsAsync(candidatePath) : fs.exists(candidatePath));
        if (!exists) break;
        suffix++;
      } while (true);
      const copySettings = {
        fontFamily: source.fontFamily ?? "default",
        pageLayout: source.pageLayout,
        isLocked: Boolean(source.isLocked),
        isPinned: false,
        isFavorite: false,
      };
      const frontmatter = mergeLocalPageSettingsIntoFrontmatter(source.localFrontmatter, copySettings);
      if (frontmatter.parseFailed) {
        toast.error(storeText("invalidFrontmatterCopy"));
        return id;
      }
      const newId = uuidv4();
      const now = Date.now();
      const copied: Page = {
        ...source,
        ...copySettings,
        id: newId,
        localFilePath: candidatePath,
        localFrontmatter: frontmatter.blob,
        localMetadataId: newId,
        localMetadataRevision: undefined,
        editorDraft: undefined,
        localUnsaved: undefined,
        localPendingCreate: undefined,
        content: cloneLocalPageContent(source.content),
        pinnedAt: undefined,
        favoriteOrder: undefined,
        createdAt: now,
        updatedAt: now,
        order: (source.order ?? 0) + 1,
        localReadState: "ready",
        localReadError: undefined,
      };
      set((state) => ({ pages: { ...state.pages, [newId]: copied } }));
      let saved = false;
      try {
        saved = await get().saveLocalPageContent(newId, copied.content, { force: true, createOnly: true });
      } catch {
      }
      if (!saved) {
        preserveLocalEditorDraft(set, get, newId, candidatePath);
        return id;
      }
      const idMap = readLocalPageIdMap(notebook.id);
      const relative = toRelativePath(notebook.localPath!, candidatePath);
      idMap[relative] = newId;
      writeLocalPageIdMap(notebook.id, idMap);
      const persisted = get().pages[newId];
      if (persisted) {
        persistPageSnapshot(persisted);
        appendLocalFolderOrderEntries(notebook.id, [persisted]);
      }
      return newId;
    });
  }

  let newId = "";
  set((state) => {
    const page = state.pages[id];
    if (!page) return state;

    newId = uuidv4();
    const now = Date.now();

    const clonedContent = structuredClone(page.content);
    if (
      clonedContent.content?.[0]?.type === "heading" &&
      clonedContent.content[0].attrs?.level === 1
    ) {
      const titleNode = clonedContent.content[0];
      const titleText = extractTitleFromContent(page.content);
      titleNode.content = [{ type: "text", text: `${titleText}_副本` }];
    }

    const newPage: Page = {
      ...page,
      id: newId,
      content: clonedContent,
      updatedAt: now,
      createdAt: now,
      trashedAt: undefined,
      isFavorite: false,
      isPinned: false,
      pinnedAt: undefined,
      order: now,
    };

    return {
      pages: {
        ...state.pages,
        [newId]: newPage,
      },
    };
  });
  persistPageSnapshot(get().pages[newId]);
  return newId;
};
