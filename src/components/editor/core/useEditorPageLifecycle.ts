import { useEffect, useLayoutEffect, useRef } from "react";
import { EditorState, type Transaction } from "@tiptap/pm/state";
import { GooseAIExtension } from "@/components/editor/ai/GooseAIExtension";
import {
  clonePageContent,
  createEditorSafeContent,
  getContentSignature,
  normalizePageContent,
  type BlockNoteContent,
} from "@/components/editor/utils/blocknote-content";
import { pageUndoHistory } from "./pageUndoHistory";
import { replacePageContent } from "./replacePageContent";
import { markProgrammaticRead } from "./programmaticRead";
import {
  toEditorBlocks,
  getCachedContentSignature,
} from "./editorContentPolicy";
import type { EditorRuntime } from "./useEditorSession";
import type { EditorContentCommit } from "./useEditorContentCommit";
import { sourceLooksHeavy, takeFastOpen } from "./fastBlockToNode";

export function useEditorPageLifecycle(
  runtime: EditorRuntime,
  { debouncedUpdate }: EditorContentCommit,
  editable: boolean,
  isActiveEditor: boolean,
) {
  const {
    editor,
    activePageId,
    page,
    userInteractedRef,
    pendingEditorChangeRef,
    pageRef,
    pageIdForUpdateRef,
    contentModeRef,
    syncedContentSignatureRef,
    onContentChangeRef,
    getLatestPage,
  } = runtime;
  useLayoutEffect(() => {
    if (!__GOOSE_EDITOR_AI__) return;
    const inlineAi = editor.getExtension(GooseAIExtension);
    // Cleanup runs before any page replacement; a detached session keeps generating in memory.
    return () => inlineAi?.detachPage();
  }, [editor, activePageId]);

  // BlockNoteView 的 editable 会在 prop 变化时重挂 ProseMirror。
  // 实例上的 isEditable 也要立刻同步，锁定当帧就不能输入。
  useEffect(() => {
    if (editor.isEditable === editable) return;
    editor.isEditable = editable;
  }, [editor, editable]);
  const prevPageIdRef = useRef<string | null>(activePageId);
  const sourceRef = useRef({ page, mode: contentModeRef.current });
  if (activePageId === prevPageIdRef.current) {
    sourceRef.current = { page, mode: contentModeRef.current };
  }
  const saveSnapshot = () => {
    const id = prevPageIdRef.current;
    if (!id) return;
    const source = getLatestPage?.(id) ?? sourceRef.current.page;
    const mode = sourceRef.current.mode;
    const untouched = !userInteractedRef.current && syncedContentSignatureRef.current;
    const blocks = untouched ? null : editor.document as BlockNoteContent;
    const signature = untouched ? syncedContentSignatureRef.current! : getContentSignature(blocks);
    const syncedSignature = untouched
      ? syncedContentSignatureRef.current
      : mode === "raw" ? signature : getCachedContentSignature(normalizePageContent(blocks));
    // A watcher may update host content before its editor reload. Never pair that new
    // source with the old document; only an exact content baseline enables the fast path.
    const cachedSource = source && getCachedContentSignature(source.content) === syncedSignature
      ? { content: source.content, mode, syncedSignature } : undefined;
    pageUndoHistory.save(id, editor.prosemirrorState, signature, cachedSource);
  };
  const saveSnapshotRef = useRef(saveSnapshot);
  saveSnapshotRef.current = saveSnapshot;
  useLayoutEffect(() => {
    if (__GOOSE_EDITOR_AI__)
      editor.getExtension(GooseAIExtension)?.detachPage();
    if (activePageId === prevPageIdRef.current) {
      const pending = takeFastOpen(editor);
      if (pending !== undefined) {
        const isLocalPage = contentModeRef.current === "raw";
        const nextContent = isLocalPage ? toEditorBlocks(pending) : normalizePageContent(pending);
        const blocks = createEditorSafeContent(nextContent, editor.schema);
        syncedContentSignatureRef.current = getCachedContentSignature(
          sourceLooksHeavy(pending) ? pending : blocks,
        );
        markProgrammaticRead(editor);
        editor.transact((tr: Transaction) => replacePageContent(tr, blocks as any));
      }
      if (activePageId) {
        const view = editor.prosemirrorView;
        const signature = !userInteractedRef.current && syncedContentSignatureRef.current
          ? syncedContentSignatureRef.current
          : getContentSignature(editor.document);
        const restored = pageUndoHistory.restore(
          activePageId,
          view.state,
          signature,
        );
        // 首次打开、且该页没有历史快照时 restore 原样返回 view.state。重复
        // updateState 会强制 React NodeView 重建；嵌套 image 正在挂载时其 getPos
        // 已失效，继而触发 Cannot find node position。
        if (restored !== view.state) {
          markProgrammaticRead(editor);
          view.updateState(restored);
        }
      }
      return;
    }
    saveSnapshotRef.current();
    prevPageIdRef.current = activePageId;

    // 切页起点即重置：侧栏点击等切页前的 pointerdown 不应算进新页面的用户编辑。
    userInteractedRef.current = false;
    pendingEditorChangeRef.current = false;

    debouncedUpdate.cancel();

    const p = pageRef.current;
    pageIdForUpdateRef.current = p?.id ?? null;
    sourceRef.current = { page: p, mode: contentModeRef.current };
    const view = editor.prosemirrorView;
    const cached = p && pageUndoHistory.restoreCached(
      p.id, view.state, p.content, contentModeRef.current,
    );
    if (cached) {
      // Rebuild plugin state once against the cached document, avoiding two NodeView mounts.
      syncedContentSignatureRef.current = cached.syncedSignature;
      markProgrammaticRead(editor);
      view.updateState(cached.state);
      return;
    }


    // raw 文档跳过 normalizePageContent（不触发 ensureFirstTitleHeading）。
    // 须与 EditorComposer.onChange 的 contentMode 判断一致：
    // raw 文档同样豁免，否则切页/重开时会把首块强转 H1 并刷新签名基线。
    const isLocalPage = contentModeRef.current === "raw";
    const nextContent = isLocalPage
      ? toEditorBlocks(p?.content)
      : normalizePageContent(p?.content);
    const nextEditorContent = createEditorSafeContent(
      nextContent,
      editor.schema,
    );
    const heavySource = sourceLooksHeavy(p?.content ?? nextContent);
    const nextSig = getCachedContentSignature(heavySource ? (p?.content ?? nextContent) : nextEditorContent);

    syncedContentSignatureRef.current = nextSig;

    markProgrammaticRead(editor);
    let replacedSize = 0;
    try {
      editor.transact((tr: Transaction) => {
        replacePageContent(tr, nextEditorContent as any);
        replacedSize = tr.doc.nodeSize;
      });
    } catch (error) {
      console.error(
        "[goose-note] replace editor blocks failed during page switch",
        {
          pageId: p?.id,
          error,
        },
      );
      const fallbackContent = createEditorSafeContent(undefined, editor.schema);
      editor.replaceBlocks(editor.document, fallbackContent as any);
      replacedSize = 0;
    }

    // 大文档的块树签名放到空闲时再算，切页本身不等整表 JSON。
    const heavy = replacedSize > 20000;
    const pageId = p?.id ?? null;
    if (!heavy) {
      const postReplaceRaw = clonePageContent(editor.document as BlockNoteContent);
      syncedContentSignatureRef.current = getCachedContentSignature(
        isLocalPage ? postReplaceRaw : normalizePageContent(postReplaceRaw),
      );
    } else {
      const reconcile = () => {
        if (pageIdForUpdateRef.current !== pageId || userInteractedRef.current) return;
        const postReplaceRaw = clonePageContent(editor.document as BlockNoteContent);
        syncedContentSignatureRef.current = getCachedContentSignature(
          isLocalPage ? postReplaceRaw : normalizePageContent(postReplaceRaw),
        );
      };
      if (typeof requestIdleCallback === "function") requestIdleCallback(reconcile, { timeout: 1500 });
      else window.setTimeout(reconcile, 300);
    }

    // 新笔记独立建栈；最近访问过且正文未在外部变化的笔记恢复自己的历史。
    if (view) {
      const newState = EditorState.create({
        doc: view.state.doc,
        plugins: view.state.plugins,
      });
      view.updateState(
        activePageId
          ? pageUndoHistory.restore(
              activePageId,
              newState,
              syncedContentSignatureRef.current ?? nextSig,
            )
          : newState,
      );
    }

    // normalize 改写了结构才回写（silent 路径：只同步内存，不触发写盘/标脏）。
    // local 页面不回写：内容未经 normalize，store 保持磁盘解析原样
    // （空文件的编辑器兜底空段落只是呈现层，不应进 store）。
    const normalizedSig = getCachedContentSignature(nextContent);
    if (
      p &&
      !isLocalPage &&
      getCachedContentSignature(p.content) !== normalizedSig
    ) {
      onContentChangeRef.current(nextContent, { silent: true });
    }

    // 切页完成 = 新一轮程序化同步起点，重置用户交互标记：
    // 切页后 BlockNote 的异步 props 补全（折叠块/视频等）不应被算作用户编辑。
    userInteractedRef.current = false;
  }, [activePageId, debouncedUpdate, editor]);

  // Bind only after the preceding layout effect has installed this page's document/history.
  useLayoutEffect(() => {
    if (__GOOSE_EDITOR_AI__)
      editor.getExtension(GooseAIExtension)?.attachPage(page.id);
  }, [
    editor,
    activePageId,
    page.id,
    editable,
    page.isLocked,
    page.trashedAt,
    page.localReadState,
  ]);

  useLayoutEffect(() => {
    if (editor._tiptapEditor.isDestroyed) return;
    editor.prosemirrorView.dom.dataset.searchPageId = activePageId ?? "";
    window.dispatchEvent(new CustomEvent("goose-note:search-editor-ready"));
  }, [activePageId, editor]);

  useLayoutEffect(
    () => () => {
      saveSnapshotRef.current();
    },
    [editor],
  );

  useEffect(() => {
    if (isActiveEditor && activePageId) pageUndoHistory.visit(activePageId);
  }, [activePageId, isActiveEditor]);
}
