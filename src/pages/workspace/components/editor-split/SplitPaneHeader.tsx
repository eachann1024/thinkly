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
        aria-label={`移动分屏：${title}`}
        aria-describedby={`split-drag-help-${leafId}`}
        title="拖动以排列分屏"
      >
        <span className="editor-split-grip" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
        </span>
      </IconButton>
      <span id={`split-drag-help-${leafId}`} className="sr-only">
        拖到另一格边缘重新排列，拖到中央交换位置。也可按空格选取，用方向键选择目标，Shift 加方向键选择边缘，回车放下，Escape 取消。
      </span>
      <IconButton
        size="xs"
        tone="muted"
        type="button"
        aria-label="关闭此格"
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
