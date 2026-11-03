import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings-dialog/useSettingsResetActions.tsx#localMessages:1">`
zh-Hans:
  resetComplete_faa3: "重置成功"
  resetFailed_4d71: "重置失败"
  languageResetFailed: "其他设置已重置，但语言设置未能恢复为跟随系统。请重新启动后重试。"
  dataIsBeingResetOrRestored_eec4: "正在重置或恢复数据，请稍后重试"
  resetTitle: "确认重置设置？"
  resetBody: "将恢复偏好设置，不会清理笔记本。"
  alsoClear: "同时清空"
  versionHistory: "历史版本"
  aiConversations: "AI 对话"
  resetPhrase: "重置设置"
  resetAction: "重置"
en:
  resetComplete_faa3: "Reset complete"
  resetFailed_4d71: "Reset failed"
  languageResetFailed: "Other settings were reset, but the language setting could not be changed to Follow system. Restart the app and try again."
  dataIsBeingResetOrRestored_eec4: "Data is being reset or restored. Please try again later."
  resetTitle: "Reset settings?"
  resetBody: "Preferences return to their defaults. Notebooks will not be cleared."
  alsoClear: "Also clear"
  versionHistory: "Version history"
  aiConversations: "AI conversations"
  resetPhrase: "Reset settings"
  resetAction: "Reset"
ja:
  resetComplete_faa3: "リセットが完了しました"
  resetFailed_4d71: "リセットに失敗しました"
  languageResetFailed: "その他の設定はリセットされましたが、言語設定を「システムに従う」に戻せませんでした。アプリを再起動して、もう一度お試しください。"
  dataIsBeingResetOrRestored_eec4: "データのリセットまたは復元中です。しばらくしてからもう一度お試しください"
  resetTitle: "設定をリセットしますか？"
  resetBody: "環境設定を初期状態に戻します。ノートブックは消去されません。"
  alsoClear: "あわせて消去"
  versionHistory: "バージョン履歴"
  aiConversations: "AI との会話"
  resetPhrase: "設定をリセット"
  resetAction: "リセット"
`;
const uiText = createTranslator(localMessages);
import { resetLanguagePreference } from "@/i18n";
import { historyRepository } from "@/lib/history/repository";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import { useSettings } from "@/stores/useSettings";
import { useSidebarView } from "@/stores/useSidebarView";
import { AI_INITIAL_STATE } from "@/stores/settings/slices/aiSlice";
import { APPEARANCE_INITIAL_STATE } from "@/stores/settings/slices/appearanceSlice";
import { LOCAL_FOLDER_INITIAL_STATE } from "@/stores/settings/slices/localFolderSlice";
import { SEARCH_PROVIDERS_INITIAL_STATE } from "@/stores/settings/slices/searchProvidersSlice";
import { SHORTCUTS_INITIAL_STATE } from "@/stores/settings/slices/shortcutsSlice";
import { WEBDAV_INITIAL_STATE } from "@/stores/settings/slices/webdavSlice";
import { toast } from "@/components/ui/sonner";
import { openConfirm } from "@/windows/open/openConfirm";
import type { useSettingsBackupRestore } from "./useSettingsBackupRestore";

export function useSettingsResetActions(
  input: ReturnType<typeof useSettingsBackupRestore>,
) {
  useLocale();
  const {
    onOpenChange,
    setTheme,
    accentColor,
    setAccentColor,
    sendDataEvent,
    beginDataOperation,
    onResetDialogOpenChange,
    restoreBackupWithRollback,
  } = input;

  const resetSettingsToDefaults = async () => {
    await useSettings.persist.clearStorage();
    useSettings.setState({
      ...structuredClone(AI_INITIAL_STATE),
      ...structuredClone(APPEARANCE_INITIAL_STATE),
      ...structuredClone(LOCAL_FOLDER_INITIAL_STATE),
      ...structuredClone(SEARCH_PROVIDERS_INITIAL_STATE),
      ...structuredClone(SHORTCUTS_INITIAL_STATE),
      ...structuredClone(WEBDAV_INITIAL_STATE),
      _hasHydrated: true,
    });
    useSettings.getState().setTheme("system");
    useSettings.getState().setAccentColor(APPEARANCE_INITIAL_STATE.accentColor);
  };

  const resetAuxiliaryAppState = () => {
    useSidebarView.persist.clearStorage();
    useSidebarView.setState({
      expandedByNotebook: {},
      focusedByNotebook: {},
      selectedByNotebook: {},
      favoritesCollapsed: false,
      sidebarCollapsed: false,
    });

    [
      "thinkly-recent-excludes",
      "thinkly-ai-panel-open",
      "thinkly-ai-panel-width",
      "sidebar-width",
      "settings-sidebar-width",
    ].forEach((key) => window.localStorage.removeItem(key));
  };

  const handleManualReset = async () => {
    onResetDialogOpenChange(true);
    const choice = await openConfirm({
      title: uiText("resetTitle"),
      body: `${uiText("resetBody")}\n${uiText("alsoClear")}`,
      checkboxes: [
        { id: "history", label: uiText("versionHistory") },
        { id: "ai", label: uiText("aiConversations") },
      ],
      phrase: uiText("resetPhrase"),
      confirmLabel: uiText("resetAction"),
      danger: true,
    }, 400);
    if (!choice) {
      onResetDialogOpenChange(false);
      return;
    }
    const id = beginDataOperation("reset");
    if (id === null) {
      onResetDialogOpenChange(false);
      return;
    }
    try {
      if (choice.checks.history) historyRepository.clearAll();
      if (choice.checks.ai) useNotebookAiChats.getState().clearAllChats();
      await resetSettingsToDefaults();
      resetAuxiliaryAppState();
      if (window.gooseLanguage) {
        try { await resetLanguagePreference(); }
        catch (cause) { throw new Error(uiText("languageResetFailed"), { cause }); }
      }
      sendDataEvent({ type: "reset.closed" });
      onOpenChange(false);
      toast.success(uiText("resetComplete_faa3"));
    } catch (error) {
      console.error("Reset failed", error);
      toast.error(uiText("resetFailed_4d71"), {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      sendDataEvent({ type: "reset.finished", id });
    }
  };

  const handleReset = async (zipBlob?: Blob) => {
    if (!zipBlob) return handleManualReset();
    const id = beginDataOperation("restore");
    if (id === null) throw new Error(uiText("dataIsBeingResetOrRestored_eec4"));
    try {
      return await restoreBackupWithRollback(zipBlob);
    } finally {
      sendDataEvent({ type: "restore.finished", id });
    }
  };

  return {
    ...input,
    resetSettingsToDefaults,
    resetAuxiliaryAppState,
    handleReset,
    handleManualReset,
  };
}
