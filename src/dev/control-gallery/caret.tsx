import { useMemo } from "react";
import { Editor } from "@/components/editor/core/Editor";
import { EditorHostBridge } from "@/pages/workspace/components/editor-host/EditorHostBridge";
import { PageDocumentTitle } from "@/pages/workspace/components/page/PageDocumentTitle";
import { buildQuickNoteDraftPage } from "@/stores/useQuickNote";

// 使用完整生产编辑器与标题；所有正文更改只留在此实例，不写入笔记或速记草稿。
const discardContent = () => {};
export function CaretGallery() {
  const page = useMemo(() => ({
    ...buildQuickNoteDraftPage(null),
    id: new URLSearchParams(location.search).get("caret-profile") === "quicknote"
      ? "__quicknote_draft__" : "__caret_acceptance__",
    content: [{ id: "caret-baseline", type: "paragraph" as const, content: [] }],
  }), []);
  return <main className="workspace-editor-surface h-screen overflow-auto bg-background text-foreground" data-page-layout="standard" data-font-family="default">
    <div className="page-layout-body"><div className="page-layout-document">
      <PageDocumentTitle page={page} focused editable />
      <EditorHostBridge page={page} contentMode="raw" isEditorFullWidth onContentChangeOverride={discardContent}>
        <Editor showSideMenu={false} />
      </EditorHostBridge>
    </div></div>
  </main>;
}
