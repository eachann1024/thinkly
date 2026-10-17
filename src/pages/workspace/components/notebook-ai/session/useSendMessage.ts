import { useLocale } from "@/i18n";
import { useCallback } from "react";
import {
  buildNotebookAiUserMessage,
  getCurrentNotebookAiPageId,
} from "@/lib/notebook-ai/context";
import { sanitizeNotebookAiMessages } from "@/lib/notebook-ai/messageUtils";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import type { AiComposerPayload } from "@/components/editor/ai/composer/referenceLookup";
import type { NotebookAiImageAttachment } from "../Composer";
import type { NotebookAiPanelSelectionCapture } from "../useNotebookAiPanel";
import { createImageFileList } from "./helpers";
import type { SessionState } from "./useSessionState";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/session/useSendMessage.ts#messages:1">`
zh-Hans:
  summarizeSelection: "总结选区内容"
  imagesUploaded: "已上传图片"
en:
  summarizeSelection: "Summarize selection"
  imagesUploaded: "Images uploaded"
ja:
  summarizeSelection: "選択範囲を要約"
  imagesUploaded: "画像をアップロードしました"
`;
const t = createTranslator(messages);


export function useSendMessage(state: SessionState) {
  useLocale();
  const {
    isBusy,
    unavailableReason,
    notebookId,
    conversationId,
    messages,
    requestCurrentPageIdRef,
    setMessages,
    clearError,
    sendMessage,
  } = state;
  const send = useCallback(
    (
      payload: AiComposerPayload,
      imageAttachments: NotebookAiImageAttachment[],
      options?: {
        capturedSelection?: NotebookAiPanelSelectionCapture | null;
        onConsumeCapturedSelection?: () => void;
      },
    ) => {
      if (isBusy || unavailableReason) return false;

      const displayText = payload.promptText.trim();
      const hasQuotes =
        (payload.selectionQuotes?.length ?? 0) > 0 ||
        payload.tokens.some((token) => token.type === "selectionQuote");
      if (!displayText && imageAttachments.length === 0 && !hasQuotes)
        return false;
      const implicitPrompt = hasQuotes
        ? "请根据选区引用总结要点。"
        : "请分析用户上传的图片。";
      const requestPayload = displayText
        ? payload
        : {
            ...payload,
            promptText: implicitPrompt,
            freeformText: "",
          };

      const currentPageId = getCurrentNotebookAiPageId(notebookId);
      const { modelText, metadata } = buildNotebookAiUserMessage({
        payload: requestPayload,
        notebookId,
        currentPageId,
        useImplicitPage: false,
      });
      metadata.displayText = displayText || (hasQuotes ? t("summarizeSelection") : t("imagesUploaded"));
      metadata.createdAt = Date.now();
      metadata.imageAttachments = imageAttachments.map(({ file }) => ({
        filename: file.name,
        mediaType: file.type || "image/*",
      }));
      if (metadata.diagnostics) {
        metadata.diagnostics.imageCount = imageAttachments.length;
      }
      const cleanedMessages = sanitizeNotebookAiMessages(messages);
      const onConsumeCapturedSelection = options?.onConsumeCapturedSelection;

      requestCurrentPageIdRef.current = currentPageId;
      if (cleanedMessages !== messages) {
        setMessages(cleanedMessages);
        useNotebookAiChats
          .getState()
          .setMessages(notebookId, conversationId, cleanedMessages);
      }

      clearError();
      void sendMessage({
        text: modelText,
        files: createImageFileList(imageAttachments),
        metadata,
      });
      onConsumeCapturedSelection?.();
      return true;
    },
    [isBusy, unavailableReason, notebookId, messages, requestCurrentPageIdRef, clearError, sendMessage, setMessages, conversationId],
  );

  return send;
}
