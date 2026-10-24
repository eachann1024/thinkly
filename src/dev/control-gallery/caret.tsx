import { useMemo } from "react";
import { Editor } from "@/components/editor/core/Editor";
import { EditorHostBridge } from "@/pages/workspace/components/editor-host/EditorHostBridge";
import { PageDocumentTitle } from "@/pages/workspace/components/page/PageDocumentTitle";
import { buildQuickNoteDraftPage } from "@/stores/useQuickNote";

const discardContent = () => {};
export function CaretGallery() {
  const params = new URLSearchParams(location.search);
  const quicknote = params.get("caret-profile") === "quicknote";
  const withFile = params.get("caret-file") === "1";
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
