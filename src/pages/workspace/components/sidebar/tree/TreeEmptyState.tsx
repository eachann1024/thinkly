import { cn } from "@/lib/utils";

interface TreeEmptyStateProps {
  isLocalNotebook: boolean;
  /** 侧栏树可视区高度；有值时用它做垂直居中，避免 flex 高度链断裂 */
  height?: number;
}

export function TreeEmptyState({
  isLocalNotebook,
  height = 0,
}: TreeEmptyStateProps) {
  const hasMeasuredHeight = height > 0;

  return (
    <div
      className={cn(
        "box-border w-full px-4 pt-3 text-left",
        !hasMeasuredHeight && "min-h-0",
      )}
      style={undefined}
    >
      <p className="text-sm font-normal leading-relaxed text-muted-foreground">
        {isLocalNotebook
          ? "暂无笔记，点击上方 ＋ 新建"
          : "请先关联本地文件夹"}
      </p>
    </div>
  );
}
