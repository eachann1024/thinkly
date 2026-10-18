import { useMemo } from "react";
import { Editor } from "@/components/editor/core/Editor";
import { EditorHostBridge } from "@/pages/workspace/components/editor-host/EditorHostBridge";
import { PageDocumentTitle } from "@/pages/workspace/components/page/PageDocumentTitle";
import { buildQuickNoteDraftPage } from "@/stores/useQuickNote";

// 使用完整生产编辑器与标题；所有正文更改只留在此实例，不写入笔记或速记草稿。
const discardContent = () => {};
export function CaretGallery() {
  const params = new URLSearchParams(location.search);
  const quicknote = params.get("caret-profile") === "quicknote";
  // caret-path=1 时带上本地文件身份，标题栏显示文件名并参与标题/正文边界导航。
  const withFile = params.get("caret-file") === "1";
  // caret-menu=1 打开块侧菜单，用于折叠箭头、拖动手柄这些只有侧菜单才有的操作。
  const withMenu = params.get("caret-menu") === "1";
  const page = useMemo(() => ({
    ...buildQuickNoteDraftPage(null),
    id: quicknote ? "__quicknote_draft__" : "__caret_acceptance__",
    ...(withFile ? { localFilePath: "/caret-acceptance/123.md", localUnsaved: false } : {}),
    content: [{ id: "caret-baseline", type: "paragraph" as const, content: [] }],
  }), [quicknote, withFile]);
  return <main className="workspace-editor-surface h-screen overflow-auto bg-background text-foreground" data-page-layout="standard" data-font-family="default">
    <div className="page-layout-body"><div className="page-layout-document">
      <PageDocumentTitle page={page} focused editable />
      <EditorHostBridge page={page} contentMode="raw" isEditorFullWidth onContentChangeOverride={discardContent}>
        <Editor showSideMenu={withMenu} />
      </EditorHostBridge>
    </div></div>
  </main>;
}
