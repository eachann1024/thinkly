import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { type ComponentProps } from "react";
import { NotebookAiPanel } from "../../components/notebook-ai/NotebookAiPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function GuardedNotebookAiPanel(
  props: ComponentProps<typeof NotebookAiPanel>,
) {
  return (
    <ErrorBoundary
      resetKey={props.notebookId}
      fallback={(_, reset) => (
        <div className="flex min-h-[260px] min-w-[240px] items-center justify-center px-4">
          <EmptyState title="AI 面板暂时无法显示" role="alert" action={
          <Button contentStyle="preserve" variant="ghost" size={null}
            type="button"
            onClick={reset}
            className="rounded-lg px-2 py-1 text-xs text-foreground"
          >
            重试
          </Button>} />
        </div>
      )}
    >
      <NotebookAiPanel {...props} />
    </ErrorBoundary>
  );
}
