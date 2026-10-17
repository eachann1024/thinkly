import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/editor-split/SplitEditorPane.tsx#localMessages:1">`
zh-Hans:
  thisNoteNoLongerExists: "页面已不存在"
  noteNotFound: "找不到这篇笔记"
  closeThisPane: "关闭此格"
  theNoteCouldnTBeDisplayed: "正文暂时无法显示"
  retry: "重试"
en:
  thisNoteNoLongerExists: "This note no longer exists"
  noteNotFound: "Note not found"
  closeThisPane: "Close this pane"
  theNoteCouldnTBeDisplayed: "The note couldn’t be displayed"
  retry: "Retry"
`;
const uiText = createTranslator(localMessages);
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useCallback, useLayoutEffect, useRef } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Editor, type EditorRef } from "@/components/editor/core/Editor";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { closeSplitPaneFromUi } from "@/lib/editor-split/commands";
import type { SplitLeaf } from "@/lib/editor-split/types";
import { SplitPaneHeader } from "./SplitPaneHeader";
import { PageDocumentTitle } from "@/pages/workspace/components/page/PageDocumentTitle";
import { hasDocumentTitle } from "@/lib/page-title-focus";
import { EditorHostBridge } from "@/pages/workspace/components/editor-host/EditorHostBridge";
import { useScrollRestoration } from "@/pages/workspace/hooks/useScrollRestoration";
import { usePages } from "@/stores/usePages";
import { useEditorPaneRegistry } from "./editorPaneRegistry";
import { useSettings } from "@/stores/useSettings";
import { SearchEditorBridge } from "../sidebar/SearchEditorBridge";
import { normalizePageLayout } from "@/lib/local-frontmatter";

export function SplitEditorPane({
  tabId,
  leaf,
  focused,
  showChrome,
}: {
  tabId: string;
  leaf: SplitLeaf;
  focused: boolean;
  showChrome: boolean;
}) {
  useLocale();
  const registry = useEditorPaneRegistry();
  const defaultLayout = useSettings(state => state.defaultPageLayout);
  const editorRef = useRef<EditorRef | null>(null);
  const scrollElRef = useRef<HTMLDivElement | null>(null);
  const setEditorRef = useCallback(
    (instance: EditorRef | null) => {
      editorRef.current = instance;
      registry.register(leaf.id, leaf.pageId, editorRef, scrollElRef.current);
    },
    [leaf.id, leaf.pageId, registry],
  );
  const { cancelPendingRestoration } = useScrollRestoration(leaf.pageId, scrollElRef);
  const page = usePages((state) => state.pages[leaf.pageId]);
  const title = page ? getPageTitle(page) : (leaf.title ?? uiText("thisNoteNoLongerExists"));

  useLayoutEffect(() => {
    registry.register(leaf.id, leaf.pageId, editorRef, scrollElRef.current);
    if (focused) registry.setFocused(leaf.id);
  }, [focused, leaf.id, leaf.pageId, registry]);

  useLayoutEffect(() => {
    return () => registry.unregister(leaf.id);
  }, [leaf.id, registry]);

  if (!page) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {showChrome ? (
          <SplitPaneHeader tabId={tabId} leafId={leaf.id} title={title} missing />
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-sm text-muted-foreground">
          <p>{uiText("noteNotFound")}</p>
          <Button contentStyle="preserve" variant="ghost" size={null}
            type="button"
            className="rounded-lg px-2 py-1 text-xs text-foreground"
            onClick={() => closeSplitPaneFromUi(tabId, leaf.id)}
          >
            {uiText("closeThisPane")}</Button>
        </div>
      </div>
    );
  }

  const isLocalFilePage = Boolean(page.localFilePath);
  const editable = !page.isLocked && !page.trashedAt;

  return (
    <div
      className="relative flex h-full min-h-0 min-w-0 flex-col"
      data-font-family={page.fontFamily ?? "default"}
      data-page-layout={normalizePageLayout(page.pageLayout ?? defaultLayout)}
      data-local-file-page={isLocalFilePage ? "true" : undefined}
    >
      {showChrome ? (
        <SplitPaneHeader tabId={tabId} leafId={leaf.id} title={title} />
      ) : null}
      <EditorHostBridge page={page} isEditorFullWidth>
        <div className="page-layout-body flex min-h-0 min-w-0 flex-1">
        <div
          ref={(el) => {
            scrollElRef.current = el;
            if (el) registry.register(leaf.id, leaf.pageId, editorRef, el);
          }}
          tabIndex={-1}
          className="page-scroll-container h-full min-h-0 min-w-0 flex-1 overflow-y-auto outline-none [background:var(--goose-editor-surface)]"
        >
          <div className="page-layout-document flex min-h-full flex-col">
            {hasDocumentTitle(page) ? (
              <PageDocumentTitle page={page} focused={focused} editable={editable} />
            ) : null}
            <ErrorBoundary
              resetKey={leaf.pageId}
              fallback={(_, reset) => (
                <div className="flex min-h-[260px] items-center justify-center">
                  <EmptyState title={uiText("theNoteCouldnTBeDisplayed")} role="alert" action={
                  <Button contentStyle="preserve" variant="ghost" size={null}
                    type="button"
                    onClick={reset}
                    className="rounded-lg px-2 py-1 text-xs text-foreground"
                  >
                    {uiText("retry")}</Button>} />
                </div>
              )}
            >
              <Editor
                ref={setEditorRef}
                editable={editable}
                isActiveEditor={focused}
              />
            </ErrorBoundary>
          </div>
        </div>
        </div>
      </EditorHostBridge>
      <SearchEditorBridge pageId={leaf.pageId} focused={focused} editorRef={editorRef} scrollRef={scrollElRef} cancelPendingRestoration={cancelPendingRestoration} />
    </div>
  );
}
