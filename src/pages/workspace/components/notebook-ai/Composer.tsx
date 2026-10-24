import { useLocale } from "@/i18n";
import { IconButton } from "@/components/ui/icon-button";
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
import { ResourcePicker } from "./composer/ResourcePicker";
import { useComposerSubmission } from "./composer/useComposerSubmission";
import { useComposerAttachments } from "./composer/useComposerAttachments";
import { useComposerSelectionHandle } from "./composer/useComposerSelectionHandle";
import type { ComposerHandle, ComposerProps } from "./composer/types";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/Composer.tsx#messages:1">`
zh-Hans:
  askAiUseForCommandsOrSkillsOr: "向 AI 提问，/ 调用指令或 Skill，@ 引用笔记或本地文件…"
  uploadImage: "上传图片"
  stopGenerating: "停止生成"
  sendMessage: "发送消息"
en:
  askAiUseForCommandsOrSkillsOr: "Ask AI, use / for commands or skills, or @ to reference notes or local files…"
  uploadImage: "Upload image"
  stopGenerating: "Stop generating"
  sendMessage: "Send message"
ja:
  askAiUseForCommandsOrSkillsOr: "AI に質問、/ でコマンドやスキルを呼び出し、@ でノートやローカルファイルを参照…"
  uploadImage: "画像をアップロード"
  stopGenerating: "生成を停止"
  sendMessage: "メッセージを送信"
`;
const t = createTranslator(messages);

export type {
  NotebookAiImageAttachment,
  ComposerHandle,
} from "./composer/types";
const MAX_IMAGE_ATTACHMENTS = 4;
const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;
export const Composer = forwardRef<ComposerHandle, ComposerProps>(
  function Composer({ ...props }, ref) {
  useLocale();
    const {
      notebookId,
      onSlashCommand,
      isStreaming,
      disabled,
      placeholder = t("askAiUseForCommandsOrSkillsOr"),
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

              <div className="notebook-ai-composer-tools flex min-w-0 items-center">
                {!isStreaming && <span className="flex shrink-0 items-center">
                  <IconButton size="sm" tone="muted"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isStreaming}
                    className={cn(
                      "flex shrink-0 items-center justify-center ",
                      "text-muted-foreground",
                      "disabled:cursor-not-allowed disabled:text-disabled",
                    )}
                    aria-label={t("uploadImage")}
                    title={t("uploadImage")}
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </IconButton>
                </span>}

                <span className="flex min-w-0 items-center">
                  <ResourcePicker inputRef={inputRef} disabled={disabled || isStreaming} />
                  <ModelSelectorPopover disabled={disabled} />
                </span>
              </div>

              <span className="flex shrink-0 items-center justify-self-end">
                {isStreaming ? (
                  <ComposerPrimitive.Cancel render={<IconButton size="sm" tone="muted" />}
                    className="bui-composer-send goose-interactive-primary"
                    aria-label={t("stopGenerating")}
                    title={t("stopGenerating")}
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
                    aria-label={t("sendMessage")}
                    title={t("sendMessage")}
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
