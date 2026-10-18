import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/editor-split/SplitPaneHeader.tsx#localMessages:1">`
zh-Hans:
  movePane: "移动分屏：{{title}}"
  dragToRearrangePanes: "拖动以排列分屏"
  dragToTheEdgeOfAnotherPane: "拖到另一格边缘重新排列，拖到中央交换位置。也可按空格选取，用方向键选择目标，Shift 加方向键选择边缘，回车放下，Escape 取消。"
  closeThisPane: "关闭此格"
en:
  movePane: "Move pane: {{title}}"
  dragToRearrangePanes: "Drag to rearrange panes"
  dragToTheEdgeOfAnotherPane: "Drag to the edge of another pane to rearrange, or to its center to swap. You can also press Space to pick up, use arrow keys to choose a pane, Shift and arrow keys to choose an edge, Enter to drop, and Escape to cancel."
  closeThisPane: "Close this pane"
ja:
  movePane: "ペインを移動：{{title}}"
  dragToRearrangePanes: "ドラッグしてペインを並べ替え"
  dragToTheEdgeOfAnotherPane: "別のペインの端にドラッグすると並べ替え、中央にドラッグすると位置を入れ替えます。スペースキーで選択し、方向キーで移動先を選び、Shift + 方向キーで端を選択、Enter で確定、Escape でキャンセルすることもできます。"
  closeThisPane: "このペインを閉じる"
`;
const uiText = createTranslator(localMessages);
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { X } from "@/components/ui/icons";
import { closeSplitPaneFromUi } from "@/lib/editor-split/commands";
import { NotebookName } from "@/pages/workspace/components/sidebar/notebook-switcher/NotebookName";
import { toggleMaximizePane } from "@/stores/useEditorSplit";
import { useNotebooks } from "@/stores/useNotebooks";
import type { Page } from "@/types";
import { NotebookMark } from "./NotebookMark";
import { SplitPaneMoreMenu } from "./SplitPaneMoreMenu";
import { SplitPanePageMenu } from "./SplitPanePageMenu";
import { isSplitHeaderBlankTarget, useSplitPaneMaximize } from "./useSplitPaneMaximize";

export function SplitPaneHeader({
  tabId,
  leafId,
  title,
  page,
  missing = false,
}: {
  tabId: string;
  leafId: string;
  title: string;
  page?: Page;
  missing?: boolean;
}) {
  useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useSplitPaneMaximize(tabId, leafId);
  const notebook = useNotebooks((state) =>
    page ? state.notebooks[page.workspaceId] : undefined,
  );
  return (
    <div
      ref={headerRef}
      data-split-chrome
      className="editor-split-header"
      data-missing={missing || undefined}
      onDoubleClick={(event) => {
        if (!isSplitHeaderBlankTarget(event.target)) return;
        toggleMaximizePane(tabId, leafId);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setMenuOpen(true);
      }}
    >
      {page ? (
        <div className="editor-split-header-crumb">
          {notebook ? (
            <>
              <NotebookMark notebook={notebook} />
              <SplitPanePageMenu tabId={tabId} leafId={leafId} page={page} scope="notebook-root">
                <Button contentStyle="preserve" variant="ghost" size={null} type="button" className="editor-split-header-notebook">
                  <NotebookName name={notebook.name} />
                </Button>
              </SplitPanePageMenu>
              <span className="editor-split-header-sep" aria-hidden="true">/</span>
            </>
          ) : null}
          <SplitPanePageMenu tabId={tabId} leafId={leafId} page={page} scope="siblings">
            <Button contentStyle="preserve" variant="ghost" size={null} type="button" className="editor-split-header-page editor-split-header-title">
              <NotebookName name={title} />
            </Button>
          </SplitPanePageMenu>
        </div>
      ) : (
        <span className="editor-split-header-title" title={title}>{title}</span>
      )}
      <div className="editor-split-header-actions">
        <IconButton
          size="sm"
          tone="muted"
          type="button"
          className="editor-split-drag-handle"
          data-split-drag-handle={leafId}
          aria-label={uiText("movePane", { title })}
          aria-describedby={`split-drag-help-${leafId}`}
          title={uiText("dragToRearrangePanes")}
        >
          <span className="editor-split-grip" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
          </span>
        </IconButton>
        <span id={`split-drag-help-${leafId}`} className="sr-only">
          {uiText("dragToTheEdgeOfAnotherPane")}</span>
        <SplitPaneMoreMenu
          tabId={tabId}
          leafId={leafId}
          page={page}
          missing={missing}
          open={menuOpen}
          onOpenChange={setMenuOpen}
        />
        <IconButton
          size="xs"
          tone="muted"
          type="button"
          aria-label={uiText("closeThisPane")}
          className="editor-split-close"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            closeSplitPaneFromUi(tabId, leafId);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </div>
  );
}
