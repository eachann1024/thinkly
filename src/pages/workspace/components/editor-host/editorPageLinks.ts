import type { Page } from "@/types";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import type { EditorPageContext } from "@/components/editor/platform/hostContext";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { buildAiFileReferenceAttrs } from "@/components/editor/ai/composer/referenceLookup";
import { createEmptyLocalPageContent } from "@/components/editor/utils/blocknote-content";
import { normalizeNewFileName } from "@/lib/new-page-name";
import { resolvePageMentionNavigation } from "@/lib/pageMentionNavigation";
import { flushEditorContent } from "@/stores/pages/actions/flushEditor";

const pendingCreates = new Map<string, Promise<Awaited<ReturnType<NonNullable<EditorPageContext["createPageMentionTarget"]>>>>>();

/** 复用现有本地创建事务：命名冲突由 record API 分配后缀，失败不会留空文件。 */
async function createMentionTarget(sourceId: string, rawTitle: string) {
  const title = normalizeNewFileName(rawTitle);
  const source = usePages.getState().pages[sourceId];
  if (!source || source.trashedAt || source.isLocked || source.localReadState === "error") {
    throw new Error("当前笔记不可编辑，未创建页面");
  }
  const notebook = useNotebooks.getState().notebooks[source.workspaceId];
  if (notebook?.source !== "local-folder") throw new Error("当前笔记本不支持创建本地页面");
  const parent = source.parentId ? usePages.getState().pages[source.parentId] : null;
  if (source.parentId && (!parent?.isFolder || parent.trashedAt || parent.workspaceId !== source.workspaceId)) {
    throw new Error("当前目录已变化，请重新选择位置");
  }
  flushEditorContent();
  const id = await usePages.getState().createLocalPageRecord({
    workspaceId: source.workspaceId, parentId: source.parentId,
    title, content: createEmptyLocalPageContent(),
  });
  if (!id) throw new Error("创建页面失败，原内容已保留");
  const created = usePages.getState().pages[id];
  if (!created) throw new Error("新页面已创建，请从侧栏打开");
  const attrs = buildAiFileReferenceAttrs(created, useNotebooks.getState().notebooks);
  return { ...attrs, title: getPageTitle(created), description: attrs.locationSnapshot || "" };
}

export function createEditorPageLinkCapabilities(source: Page): Pick<EditorPageContext,
  "resolvePageMention" | "subscribePageMetadata" | "createPageMentionTarget"
> {
  return {
    resolvePageMention: (props) => {
      const resolved = resolvePageMentionNavigation(props.pageId, usePages.getState().pages,
        props.workspaceId || source.workspaceId, props.wikiTarget);
      if (!resolved.ok) return null;
      return {
        title: getPageTitle(resolved.page),
        notebookName: useNotebooks.getState().notebooks[resolved.page.workspaceId]?.name || "",
      };
    },
    subscribePageMetadata: (listener) => {
      const offPages = usePages.subscribe(listener), offNotebooks = useNotebooks.subscribe(listener);
      return () => { offPages(); offNotebooks(); };
    },
    createPageMentionTarget: useNotebooks.getState().notebooks[source.workspaceId]?.source === "local-folder"
      ? (title) => {
          const key = `${source.id}\0${title.trim()}`;
          const existing = pendingCreates.get(key);
          if (existing) return existing;
          const pending = createMentionTarget(source.id, title);
          pendingCreates.set(key, pending);
          void pending.finally(() => { if (pendingCreates.get(key) === pending) pendingCreates.delete(key); }).catch(() => {});
          return pending;
        }
      : undefined,
  };
}
