import { useLocale } from "@/i18n";
import { useCallback, useRef } from "react";
import { toast } from "@/components/ui/sonner";
import { normalizeAiComposerPayload } from "@/components/editor/ai/composer/referenceLookup";
import { prepareNotebookAiReferences } from "@/lib/notebook-ai/readResourceScope";
import { freezeNotebookAiComposerRun } from "@/lib/notebook-ai/runContext";
import { localizeNotebookAiDiagnostic } from "@/lib/notebook-ai/localizeDiagnostic";
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
  const preparing = useRef(false);
  const {
    isBusy,
    unavailableReason,
    notebookId,
    conversationId,
    chat,
    requestCurrentPageIdRef,
  } = state;
  const send = useCallback(
    async (
      payload: AiComposerPayload,
      imageAttachments: NotebookAiImageAttachment[],
      options?: {
        capturedSelection?: NotebookAiPanelSelectionCapture | null;
        onConsumeCapturedSelection?: () => void;
      },
    ) => {
      if (isBusy || unavailableReason || preparing.current) return false;

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
      preparing.current = true;
      try {
        await prepareNotebookAiReferences(
          normalizeAiComposerPayload(requestPayload).resources,
        );
        const { modelText, metadata } = buildNotebookAiUserMessage({
          payload: requestPayload,
          notebookId,
          currentPageId,
          useImplicitPage: false,
        });
        metadata.displayText =
          displayText ||
          (hasQuotes ? t("summarizeSelection") : t("imagesUploaded"));
        metadata.createdAt = Date.now();
        metadata.currentPageId = currentPageId;
        metadata.writeScope = freezeNotebookAiComposerRun({
          notebookId,
          currentPageId,
          payload: requestPayload,
          references: metadata.resourceReferences,
        });
        metadata.imageAttachments = imageAttachments.map(({ file }) => ({
          filename: file.name,
          mediaType: file.type || "image/*",
        }));
        if (metadata.diagnostics) {
          metadata.diagnostics.imageCount = imageAttachments.length;
        }
        const cleanedMessages = sanitizeNotebookAiMessages(chat.messages);
        const onConsumeCapturedSelection = options?.onConsumeCapturedSelection;

        requestCurrentPageIdRef.current = currentPageId;
        if (cleanedMessages !== chat.messages) {
          chat.messages = cleanedMessages;
          useNotebookAiChats
            .getState()
            .setMessages(notebookId, conversationId, cleanedMessages);
        }

        chat.clearError();
        void chat.sendMessage({
          text: modelText,
          files: createImageFileList(imageAttachments),
          metadata,
        });
        onConsumeCapturedSelection?.();
        return true;
      } catch (error) {
        toast.error(
          localizeNotebookAiDiagnostic(
            error instanceof Error ? error.message : "引用加载失败，请重试",
          ),
        );
        return false;
      } finally {
        preparing.current = false;
      }
    },
    [
      isBusy,
      unavailableReason,
      notebookId,
      chat,
      requestCurrentPageIdRef,
      conversationId,
    ],
  );

  return send;
}
