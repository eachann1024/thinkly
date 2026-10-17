import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import { captureInlineSelectionParts } from "@/components/editor/ai/selectionPrivacy";
import { setFakeSelection } from "@/components/editor/extensions/fakeSelectionExtension";
import { resolveFormattingToolbarAiBlockId } from "./selectionBlocks";
import { useEditorSettings } from "@/components/editor/platform/hostContext";
import { toast } from "@/components/ui/sonner";
import { getCustomAIApiKey } from "@/lib/ai-provider";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/toolbars/formatting/useFormattingToolbarAiActivate.ts#messages:1">`
zh-Hans:
  thisPageCannotBeEdited: "当前页面不可编辑。"
  enableTheAiAssistantInSettingsFirst: "AI 助手尚未开启，请先到设置中打开"
  noApiKeyIsConfiguredCheckSettingsAi: "未填写 API Key。请前往「设置 › AI 助手 › AI 服务」检查配置。"
  saveTheAiServiceSettingsAndLoadThe: "请先保存 AI 服务配置并获取模型列表"
  theSelectionCouldNotBeLocatedSelectThe: "无法定位当前选区，请重新选中正文文字后再试"
  thisSelectionDoesNotSupportInlineRewritingSelect: "当前选区暂不支持行内改写，请重新选择正文文字。"
en:
  thisPageCannotBeEdited: "This page cannot be edited."
  enableTheAiAssistantInSettingsFirst: "Enable the AI assistant in Settings first"
  noApiKeyIsConfiguredCheckSettingsAi: "No API key is configured. Check Settings › AI assistant › AI service."
  saveTheAiServiceSettingsAndLoadThe: "Save the AI service settings and load the model list first"
  theSelectionCouldNotBeLocatedSelectThe: "The selection could not be located. Select the body text again and retry."
  thisSelectionDoesNotSupportInlineRewritingSelect: "This selection does not support inline rewriting. Select body text and try again."
`;
const t = createTranslator(messages);


export function useFormattingToolbarAiActivate({
  editor,
  aiSettings,
  aiExtension,
  activateFormattingToolbarAi,
  resetFormattingToolbarAi,
  setActiveTooltip,
}: {
  editor: BlockNoteEditor<any, any, any>;
  aiSettings: ReturnType<typeof useEditorSettings>["ai"];
  aiExtension?: { openAIMenuAtBlock: (blockId: string) => void };
  activateFormattingToolbarAi: (
    selection: { from: number; to: number },
    owner?: object,
  ) => void;
  resetFormattingToolbarAi: (owner?: object) => void;
  setActiveTooltip: Dispatch<SetStateAction<string | null>>;
}) {
  useLocale();
  // AI 按钮打开自有菜单，冻结当前字符选区。
  // 保存 selection 作为 AI 浮层锚点，并在菜单生命周期内隐藏格式工具栏。
  const handleAiActivate = useCallback(() => {
    try {
      const { selection } = editor.prosemirrorState;
      if (selection.empty) return;
      if (!editor.isEditable) {
        toast.error(t("thisPageCannotBeEdited"));
        return;
      }
      // Freeze only supported text containers; node selections exclude implicit children.
      captureInlineSelectionParts(editor.prosemirrorState.doc, selection);

      if (!aiSettings.enabled) {
        toast.error(t("enableTheAiAssistantInSettingsFirst"));
        return;
      }
      const apiKey = getCustomAIApiKey(aiSettings);
      if (!apiKey) {
        toast.error(
          t("noApiKeyIsConfiguredCheckSettingsAi"),
        );
        return;
      }
      const hasModel =
        aiSettings.selectedModelId?.trim() ||
        aiSettings.customModelOptions[0]?.id;
      if (!hasModel) {
        toast.error(t("saveTheAiServiceSettingsAndLoadThe"));
        return;
      }

      const saved = { from: selection.from, to: selection.to };
      setFakeSelection(editor, saved);
      activateFormattingToolbarAi(saved, editor);

      const blockId = resolveFormattingToolbarAiBlockId(editor);
      if (!blockId) {
        setFakeSelection(editor, null);
        resetFormattingToolbarAi(editor);
        toast.error(t("theSelectionCouldNotBeLocatedSelectThe"));
        return;
      }
      setActiveTooltip(null);
      aiExtension?.openAIMenuAtBlock(blockId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("thisSelectionDoesNotSupportInlineRewritingSelect"),
      );
      try {
        setFakeSelection(editor, null);
      } catch {
        /* ignore */
      }
      resetFormattingToolbarAi(editor);
    }
  }, [
    activateFormattingToolbarAi,
    aiExtension,
    aiSettings,
    editor,
    resetFormattingToolbarAi,
  ]);

  return handleAiActivate;
}
