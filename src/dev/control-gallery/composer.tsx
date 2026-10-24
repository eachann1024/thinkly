import { useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Editor } from "@/components/editor/core/Editor";
import { EditorHostBridge } from "@/pages/workspace/components/editor-host/EditorHostBridge";
import { NotebookAiSessionProvider } from "@/pages/workspace/components/notebook-ai/NotebookAiSession";
import { buildAiFileReferenceAttrs } from "@/components/editor/ai/composer/referenceLookup";
import { Composer, type ComposerHandle } from "@/pages/workspace/components/notebook-ai/Composer";
import { buildQuickNoteDraftPage, useQuickNote } from "@/stores/useQuickNote";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";

export function GalleryComposer() {
  const composerRef = useRef<ComposerHandle>(null);
  const page = useMemo(() => buildQuickNoteDraftPage(null), []);
  const saveDraft = useCallback((content: BlockNoteContent) => {
    useQuickNote.getState().setDraftContent(content, 1);
  }, []);
  return <section className="space-y-4" aria-labelledby="gallery-composer">
    <h2 id="gallery-composer" className="text-lg font-semibold">正文与 AI 输入</h2>
    <p className="text-sm text-muted-foreground">使用生产编辑器、输入框和本地草稿。这里用于观察连续输入、换行和删除，不发送 AI 请求，也不验收文件系统。</p>
    <EditorHostBridge page={page} isEditorFullWidth onContentChangeOverride={saveDraft}>
      <div className="h-48 overflow-auto rounded-lg border border-border p-3" aria-label="正文输入样本"><Editor showSideMenu={false} /></div>
      <Button type="button" variant="outline" size="sm" onClick={() => {
        composerRef.current?.insertReference(buildAiFileReferenceAttrs(page, {}));
        composerRef.current?.focus();
      }}>引用当前草稿</Button>
      <div className="max-w-[480px]" aria-label="AI 输入样本">
        <NotebookAiSessionProvider notebookId="control-gallery-composer">
          <Composer ref={composerRef} notebookId="control-gallery-composer" isStreaming={false} onSend={() => false} />
        </NotebookAiSessionProvider>
      </div>
    </EditorHostBridge>
  </section>;
}
