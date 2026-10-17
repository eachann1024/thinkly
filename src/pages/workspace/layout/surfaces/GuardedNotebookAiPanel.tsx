import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/layout/surfaces/GuardedNotebookAiPanel.tsx#localMessages:1">`
zh-Hans:
  theAiPanelCouldnTBeDisplayed: "AI 面板暂时无法显示"
  retry: "重试"
en:
  theAiPanelCouldnTBeDisplayed: "The AI panel couldn’t be displayed"
  retry: "Retry"
`;
const uiText = createTranslator(localMessages);
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
          <EmptyState title={uiText("theAiPanelCouldnTBeDisplayed")} role="alert" action={
          <Button contentStyle="preserve" variant="ghost" size={null}
            type="button"
            onClick={reset}
            className="rounded-lg px-2 py-1 text-xs text-foreground"
          >
            {uiText("retry")}</Button>} />
        </div>
      )}
    >
      <NotebookAiPanel {...props} />
    </ErrorBoundary>
  );
}
