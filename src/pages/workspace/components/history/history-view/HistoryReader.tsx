import { type ReactNode } from "react";
import * as GooseIcons from "@/components/ui/icons";
import type { GooseIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HistoryReadOnlyEditor } from "../HistoryReadOnlyEditor";
import { useHistoryViewLogic } from "./useHistoryViewLogic";

export function HistoryReaderState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: GooseIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[280px] items-center justify-center px-6">
      <EmptyState icon={Icon} title={title} details={description} action={action} />
    </div>
  );
}

export /**
 * 主区只读编辑器。挂在 workspace-editor-surface > page-scroll-container 内，
 * 复用与主 Editor 完全一致的滚动容器和 max-w-4xl 包裹。
 */
function HistoryReader() {
  const {
    selectedContent,
    selectedVersionId,
    selectedStatus,
    isEmpty,
    indexError,
  } = useHistoryViewLogic();

  if (selectedStatus === "loading") {
    return (
      <HistoryReaderState
        icon={GooseIcons.LoaderCircle}
        title="正在读取历史版本"
      />
    );
  }

  if (isEmpty) {
    return (
      <HistoryReaderState
        icon={indexError ? GooseIcons.FileWarning : GooseIcons.History}
        title={indexError ? "历史列表无法读取" : "暂无历史版本"}
        description={indexError ?? undefined}
      />
    );
  }

  if (selectedStatus === "missing") {
    return (
      <HistoryReaderState
        icon={GooseIcons.FileQuestion}
        title="此历史版本不可读取"
        description="若使用云盘，请确认已登录并下载此版本文件。"
      />
    );
  }

  if (selectedStatus === "error") {
    return (
      <HistoryReaderState
        icon={GooseIcons.FileWarning}
        title="此历史版本格式异常"
      />
    );
  }

  if (!(selectedContent && selectedVersionId)) {
    return (
      <HistoryReaderState
        icon={GooseIcons.MousePointerClick}
        title="选择左侧的历史版本"
      />
    );
  }

  return (
    <ErrorBoundary
      resetKey={selectedVersionId}
      fallback={(_, reset) => (
        <HistoryReaderState
          icon={GooseIcons.FileWarning}
          title="历史版本暂时无法显示"
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto rounded-lg px-2 py-1 text-xs shadow-none"
              onClick={reset}
            >
              重试
            </Button>
          }
        />
      )}
    >
      <HistoryReadOnlyEditor
        content={selectedContent}
        versionKey={selectedVersionId}
      />
    </ErrorBoundary>
  );
}
