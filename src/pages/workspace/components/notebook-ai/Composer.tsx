import { IconButton } from "@/components/ui/icon-button";
/** Notebook AI 输入条：草稿、附件、布局与原生引用动作各自维护。 */
import { forwardRef, useCallback } from "react";
import { ArrowUp, Plus } from "@/components/ui/icons";
import { ComposerPrimitive } from "@assistant-ui/react";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { PromptBar } from "./beautiful-ui/PromptBar";
import { AiComposerInput } from "@/components/editor/ai/composer/AiComposerInput";
import { ModelSelectorPopover } from "./ModelSelectorPopover";
import { usePlanRefinementInput } from "./approval/usePlanRefinementInput";
import { useComposerSurface } from "./composer/useComposerSurface";
import { useComposerDraft } from "./composer/useComposerDraft";
import { useComposerSubmission } from "./composer/useComposerSubmission";
import { useComposerAttachments } from "./composer/useComposerAttachments";
import { useComposerSelectionHandle } from "./composer/useComposerSelectionHandle";
import type { ComposerHandle, ComposerProps } from "./composer/types";
export type {
  NotebookAiImageAttachment,
  ComposerHandle,
} from "./composer/types";
const MAX_IMAGE_ATTACHMENTS = 4;
const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;
export const Composer = forwardRef<ComposerHandle, ComposerProps>(
  function Composer({ ...props }, ref) {
    const {
      notebookId,
      onSlashCommand,
      isStreaming,
      disabled,
      placeholder = "向 AI 提问，/ 调用指令或 Skill，@ 引用笔记或本地文件…",
      searchPages,
      onEscape,
      layout = "side-panel",
    } = props;
    const isFullscreen = layout === "fullscreen";
    const surface = useComposerSurface(props);
    usePlanRefinementInput(notebookId, surface.inputRef, disabled || isStreaming);
    const {
      inputRef,
      fileInputRef,
      autoFocusToken,
      seedContent,
      isEmpty,
      setIsEmpty,
    } = surface;
    const { cancelPendingDraftPersist, handleContentChange } =
      useComposerDraft(notebookId);
    const handleEscape = useCallback(() => {
      onEscape?.();
    }, [onEscape]);
    const handleSubmit = useComposerSubmission(
      props,
      surface,
      cancelPendingDraftPersist,
    );
    const {
      dropActive,
      handleImageInput,
      handleDockPaste,
      handleDockDragOver,
      handleDockDragLeave,
      handleDockDrop,
    } = useComposerAttachments(props, surface);
    useComposerSelectionHandle(props, surface, ref);
    // isEmpty 在 IME 会话里会滞后；发送按钮不因 isEmpty 禁用，避免「有字点不了」
    // 真正空内容由 handleSubmit 读 DOM 拦截。
    const canClickSend = !isStreaming && !disabled;
    const sendLooksReady = canClickSend && !isEmpty;

    return (
      <ComposerPrimitive.Root
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        className={cn(
          "notebook-ai-composer-form pointer-events-none",
          isFullscreen ? "px-6 pb-5" : "px-0 pb-[12px]",
        )}
      >
        <div
          className={cn(
            "pointer-events-auto mx-auto w-full",
            isFullscreen ? "max-w-[720px]" : "max-w-none",
          )}
        >
          <PromptBar streaming={isStreaming}>
            <div
              className={cn(
                "notebook-ai-composer-shell bui-root",
                dropActive &&
                  "ring-1 ring-inset ring-[var(--goose-accent-solid)]",
              )}
              data-expanded="true"
              data-drop-active={dropActive ? "true" : undefined}
              onPaste={handleDockPaste}
              onDragEnter={handleDockDragOver}
              onDragOver={handleDockDragOver}
              onDragLeave={handleDockDragLeave}
              onDrop={handleDockDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="sr-only"
                onChange={handleImageInput}
                disabled={disabled || isStreaming}
              />
              <span className="flex shrink-0 items-center">
                <IconButton size="sm" tone="muted"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isStreaming}
                  className={cn(
                    "flex shrink-0 items-center justify-center ",
                    "text-muted-foreground",
                    "disabled:cursor-not-allowed disabled:text-disabled",
                    isStreaming && "invisible pointer-events-none",
                  )}
                  aria-hidden={isStreaming}
                  tabIndex={isStreaming ? -1 : undefined}
                  aria-label="上传图片"
                  title="上传图片"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                </IconButton>
              </span>

              {/* 输入区域与工具栏保持同一节点，内容增高只由 CSS 处理。 */}
              <AiComposerInput
                ref={inputRef}
                placeholder={placeholder}
                autoFocusToken={autoFocusToken}
                initialContent={seedContent}
                onContentChange={handleContentChange}
                onSubmit={handleSubmit}
                onEscape={handleEscape}
                onIsEmptyChange={setIsEmpty}
                className="notebook-ai-composer-input order-first col-span-full w-full"
                searchPages={searchPages}
                referencePlacement="inline"
                variant="panel"
                notebookId={notebookId}
                disabled={disabled || isStreaming}
                maxImageBytes={MAX_IMAGE_FILE_BYTES}
                maxImageCount={MAX_IMAGE_ATTACHMENTS}
                onImageRejected={(message) => toast.error(message)}
                onSlashCommand={onSlashCommand}
              />

              <span className="flex min-w-0 items-center">
                <ModelSelectorPopover disabled={disabled} />
              </span>

              <span className="flex shrink-0 items-center justify-self-end">
                {isStreaming ? (
                  <ComposerPrimitive.Cancel render={<IconButton size="sm" tone="muted" />}
                    className="bui-composer-send goose-interactive-primary"
                    aria-label="停止生成"
                    title="停止生成"
                  >
                    <span className="notebook-ai-stop-square" aria-hidden="true" />
                  </ComposerPrimitive.Cancel>
                ) : (
                  <IconButton size="sm" tone="muted"
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canClickSend}
                    className={cn("bui-composer-send notebook-ai-send-button", sendLooksReady && "goose-interactive-primary")}
                    data-ready={sendLooksReady ? "true" : "false"}
                    aria-label="发送消息"
                    title="发送消息"
                  >
                    <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </IconButton>
                )}
              </span>
            </div>
          </PromptBar>
        </div>
      </ComposerPrimitive.Root>
    );
  },
);

Composer.displayName = "Composer";
