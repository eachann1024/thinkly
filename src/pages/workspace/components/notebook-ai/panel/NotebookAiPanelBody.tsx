import { IconButton } from "@/components/ui/icon-button";
import { useSettings } from "@/stores/useSettings";
import { AiUnavailableState } from "./AiUnavailableState";
import { CircleAlert, X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { ChatMessages } from "../ChatMessages";
import { Composer } from "../Composer";
import {
  formatNotebookAiChatError,
  type NotebookAiSessionValue,
} from "../NotebookAiSession";
import type { NotebookAiPanelProps } from "./types";
import type { PanelCommands } from "./usePanelCommands";
import type { PanelSurfaceState } from "./usePanelSurface";
import type { usePanelComposerSeed } from "./usePanelComposerSeed";
export function NotebookAiPanelBody({
  props,
  session,
  surface,
  commands,
  seed,
  isFullscreen,
  streamingMessageId,
}: {
  props: NotebookAiPanelProps;
  session: NotebookAiSessionValue;
  surface: PanelSurfaceState;
  commands: PanelCommands;
  seed: ReturnType<typeof usePanelComposerSeed>;
  isFullscreen: boolean;
  streamingMessageId?: string;
}) {
  const { notebookId, onClose, editorRef: _editorRef } = props;
  const { bodyReady, composerDockRef, composerRef } = surface;
  const {
    unavailableReason,
    messages,
    onBatchApproval,
    onBatchUndo,
    error,
    clearError,
    composerRevision,
    conversationId,
    isBusy,
    searchPages,
  } = session;
  const hydrated = useSettings((state) => state._hasHydrated);
  const unavailable = !hydrated || Boolean(unavailableReason);
  const { composerSeedContent } = seed;
  const { handleSend, handleSlashCommand, composerPlaceholder } = commands;
  return (
    <>
      <div className="notebook-ai-zoom-slot notebook-ai-content-surface">
        <div className="notebook-ai-zoom-surface">
          {bodyReady && (!unavailable || messages.length > 0) ? (
            <ChatMessages
              messages={messages}
              onEmptySuggestion={(text) => {
                void handleSend(
                  {
                    promptText: text,
                    freeformText: text,
                    references: [],
                    images: [],
                    skills: [],
                    tokens: [{ type: "text", text }],
                  },
                  [],
                );
              }}
              streamingMessageId={streamingMessageId}
              editorRef={_editorRef}
              layout={isFullscreen ? "fullscreen" : "side-panel"}
              onBatchApproval={onBatchApproval}
              onBatchUndo={onBatchUndo}
            />
          ) : null}
          {bodyReady && unavailable ? (
            <AiUnavailableState
              reason={unavailableReason}
              error={error}
              onRetry={clearError}
              compact={messages.length > 0}
            />
          ) : null}
        </div>
      </div>

      <div
        ref={composerDockRef}
        className="notebook-ai-composer-dock"
        style={unavailable ? { display: "none" } : undefined}
        aria-hidden={unavailable || undefined}
        inert={unavailable || undefined}
      >
        {bodyReady && error ? (
          <div
            className={cn(
              "pointer-events-auto mb-2 w-full",
              isFullscreen ? "px-6" : "px-0",
            )}
          >
            <div
              className={cn(
                "flex items-start gap-2 rounded-[10px] border border-[var(--goose-color-danger-focus)] bg-[var(--goose-color-danger-subtle-bg)] px-3 py-2.5 text-xs",
                isFullscreen && "mx-auto max-w-[720px]",
              )}
              role="alert"
            >
              <CircleAlert
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--goose-color-danger-focus)]"
                strokeWidth={1.75}
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[var(--goose-color-danger-focus)]">
                  本轮失败原因
                </div>
                <div className="mt-0.5 break-words leading-relaxed text-foreground">
                  {formatNotebookAiChatError(error)}
                </div>
              </div>
              <IconButton size="xs" tone="muted"
                type="button"
                onClick={() => clearError()}
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[var(--goose-color-danger-focus)] outline-none hover:bg-[var(--goose-color-danger-subtle-bg)]"
                aria-label="关闭错误提示"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </IconButton>
            </div>
          </div>
        ) : null}

        {bodyReady ? (
          <Composer
            ref={composerRef}
            key={`${notebookId}-${composerRevision}`}
            notebookId={notebookId}
            conversationId={conversationId}
            initialContent={composerSeedContent}
            onSend={handleSend}
            onSlashCommand={handleSlashCommand}
            isStreaming={isBusy}
            disabled={unavailable}
            placeholder={composerPlaceholder}
            searchPages={searchPages}
            onEscape={onClose}
            layout={isFullscreen ? "fullscreen" : "side-panel"}
          />
        ) : (
          <div className="h-[4.75rem]" aria-hidden />
        )}
      </div>
    </>
  );
}
