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
`;
const uiText = createTranslator(localMessages);
import { IconButton } from "@/components/ui/icon-button";
import { X } from "@/components/ui/icons";
import { closeSplitPaneFromUi } from "@/lib/editor-split/commands";

export function SplitPaneHeader({
  tabId,
  leafId,
  title,
  missing = false,
}: {
  tabId: string;
  leafId: string;
  title: string;
  missing?: boolean;
}) {
  return (
    <div data-split-chrome className="editor-split-header" data-missing={missing || undefined}>
      <span className="editor-split-header-title" title={title}>{title}</span>
      <IconButton
        size="sm"
        tone="muted"
        type="button"
        className="editor-split-drag-handle"
        data-split-drag-handle={leafId}
        aria-label={uiText("movePane", {title})}
        aria-describedby={`split-drag-help-${leafId}`}
        title={uiText("dragToRearrangePanes")}
      >
        <span className="editor-split-grip" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
        </span>
      </IconButton>
      <span id={`split-drag-help-${leafId}`} className="sr-only">
        {uiText("dragToTheEdgeOfAnotherPane")}</span>
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
  );
}
