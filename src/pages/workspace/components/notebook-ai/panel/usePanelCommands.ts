import { useLocale } from "@/i18n";
import { useCallback, useEffect, type KeyboardEvent } from "react";
import { isWorkspaceSettingsOpen } from "@/lib/settings-navigation";
import { OPEN_ESCAPE_LAYER_SELECTOR } from "@/lib/escape-close";
import { isImeKeyboardEvent } from "@/hooks/useImeInput";
import type { AiComposerPayload } from "@/components/editor/ai/composer/referenceLookup";
import type { NotebookAiImageAttachment } from "../Composer";
import {
  getNotebookAiPlaceholderHints,
  type NotebookAiSessionValue,
} from "../NotebookAiSession";
import type { NotebookAiPanelProps } from "./types";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/panel/usePanelCommands.ts#messages:1">`
zh-Hans:
  configureAnAiModelInSettingsFirst: "请先在设置中配置 AI 模型"
  generating: "正在生成结果…"
en:
  configureAnAiModelInSettingsFirst: "Configure an AI model in Settings first"
  generating: "Generating…"
ja:
  configureAnAiModelInSettingsFirst: "先に設定で AI モデルを構成してください"
  generating: "結果を生成中…"
`;
const t = createTranslator(messages);

export function usePanelCommands(
  props: NotebookAiPanelProps,
  session: NotebookAiSessionValue,
  isFullscreen: boolean,
) {
  useLocale();
  const { onClose, capturedSelection, onConsumeCapturedSelection } = props;
  const {
    unavailableReason,
    isBusy,
    placeholderIndex,
    send,
    newConversation,
    compactConversation,
    selectConversation,
    deleteConversation,
  } = session;
  const handlePanelKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (isWorkspaceSettingsOpen()) return;
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.stopPropagation();
      onClose();
    },
    [onClose],
  );

  // 全屏覆盖主区：Esc 在输入框失焦（点消息、侧栏、空白）后仍须退出。
  // ChatChrome onKeyDown 只在焦点位于面板子树时冒泡；Composer onEscape 只在输入框内。
  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (isWorkspaceSettingsOpen()) return;
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isImeKeyboardEvent(event)) return;
      if (document.querySelector(OPEN_ESCAPE_LAYER_SELECTOR)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen, onClose]);

  const composerPlaceholder = unavailableReason
    ? t("configureAnAiModelInSettingsFirst")
    : isBusy
      ? t("generating")
      : getNotebookAiPlaceholderHints()[placeholderIndex];

  const handleSend = useCallback(
    (
      payload: AiComposerPayload,
      imageAttachments: NotebookAiImageAttachment[],
    ) => {
      return send(payload, imageAttachments, {
        capturedSelection,
        onConsumeCapturedSelection,
      });
    },
    [send, capturedSelection, onConsumeCapturedSelection],
  );

  const handleNewConversation = useCallback(() => {
    newConversation({ onConsumeCapturedSelection });
  }, [newConversation, onConsumeCapturedSelection]);

  const handleSlashCommand = useCallback(
    (id: "new" | "compact") => {
      if (id === "new") {
        handleNewConversation();
        return;
      }
      compactConversation();
    },
    [compactConversation, handleNewConversation],
  );

  const handleSelectConversation = useCallback(
    (nextConversationId: string) => {
      selectConversation(nextConversationId, { onConsumeCapturedSelection });
    },
    [selectConversation, onConsumeCapturedSelection],
  );

  const handleDeleteConversation = useCallback(
    (targetConversationId: string) => {
      deleteConversation(targetConversationId);
    },
    [deleteConversation],
  );

  return {
    handlePanelKeyDown,
    composerPlaceholder,
    handleSend,
    handleNewConversation,
    handleSlashCommand,
    handleSelectConversation,
    handleDeleteConversation,
  };
}
export type PanelCommands = ReturnType<typeof usePanelCommands>;
