import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings-dialog/useSettingsDialogState.tsx#localMessages:1">`
zh-Hans:
  iUnderstandTheRisks_438d: "我已知晓风险"
en:
  iUnderstandTheRisks_438d: "I understand the risks"
ja:
  iUnderstandTheRisks_438d: "リスクを理解しました"
`;
const uiText = createTranslator(localMessages);
import { useSettingsDataOperation } from "./useSettingsDataOperation";
import { useShallow } from "zustand/react/shallow";
import { useNotebooks, sortNotebooksByOrder } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";
import type { ExportOptions } from "@/lib/export";
import type { SettingsDialogProps } from "./shared";

export function useSettingsDialogState({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
  sidebarContainer,
  mainContainer,
}: SettingsDialogProps) {
  useLocale();
  const [hasOpened, setHasOpened] = useState(open);

  useEffect(() => {
    if (open) setHasOpened(true);
  }, [open]);

  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    ai,
    setAIEnabled,
    setAIReadGlobalPrompt,
    setAIReadLocalSkills,
    setAISelectedModelId,
    saveAICustomConfig,
    privacy,
    setAutoOpenLastNote,
    singleTabMode,
    showRecentInSearch,
    setShowRecentInSearch,
    closeTabShortcut,
    setCloseTabShortcut,
    searchPanelCloseShortcut,
    setSearchPanelCloseShortcut,
    appShortcuts,
    setAppShortcut,
    resetAppShortcuts,
    customFonts,
    setCustomFont,
    uiFontSize,
    setUIFontSize,
    editorFontSize,
    increaseEditorFontSize,
    decreaseEditorFontSize,
    notebookDropdownHoverExpand,
    setNotebookDropdownHoverExpand,
    localFolderFileManager,
    setLocalFolderFileManager,
    localFolderExternalEditor,
    setLocalFolderExternalEditor,
    localFolderTerminal,
    setLocalFolderTerminal,
    localFolderHiddenFolders,
    setLocalFolderHiddenFolders,
  } = useSettings(
    useShallow((s) => ({
      theme: s.theme,
      setTheme: s.setTheme,
      accentColor: s.accentColor,
      setAccentColor: s.setAccentColor,
      ai: s.ai,
      setAIEnabled: s.setAIEnabled,
      setAIReadGlobalPrompt: s.setAIReadGlobalPrompt,
      setAIReadLocalSkills: s.setAIReadLocalSkills,
      setAISelectedModelId: s.setAISelectedModelId,
      saveAICustomConfig: s.saveAICustomConfig,
      privacy: s.privacy,
      setAutoOpenLastNote: s.setAutoOpenLastNote,
      singleTabMode: s.singleTabMode,
      showRecentInSearch: s.showRecentInSearch,
      setShowRecentInSearch: s.setShowRecentInSearch,
      closeTabShortcut: s.closeTabShortcut,
      setCloseTabShortcut: s.setCloseTabShortcut,
      searchPanelCloseShortcut: s.searchPanelCloseShortcut,
      setSearchPanelCloseShortcut: s.setSearchPanelCloseShortcut,
      appShortcuts: s.appShortcuts,
      setAppShortcut: s.setAppShortcut,
      resetAppShortcuts: s.resetAppShortcuts,
      customFonts: s.customFonts,
      setCustomFont: s.setCustomFont,
      uiFontSize: s.uiFontSize,
      setUIFontSize: s.setUIFontSize,
      editorFontSize: s.editorFontSize,
      increaseEditorFontSize: s.increaseEditorFontSize,
      decreaseEditorFontSize: s.decreaseEditorFontSize,
      notebookDropdownHoverExpand: s.notebookDropdownHoverExpand,
      setNotebookDropdownHoverExpand: s.setNotebookDropdownHoverExpand,
      localFolderFileManager: s.localFolderFileManager,
      setLocalFolderFileManager: s.setLocalFolderFileManager,
      localFolderExternalEditor: s.localFolderExternalEditor,
      setLocalFolderExternalEditor: s.setLocalFolderExternalEditor,
      localFolderTerminal: s.localFolderTerminal,
      setLocalFolderTerminal: s.setLocalFolderTerminal,
      localFolderHiddenFolders: s.localFolderHiddenFolders,
      setLocalFolderHiddenFolders: s.setLocalFolderHiddenFolders,
    })),
  );

  const { notebooks } = useNotebooks(
    useShallow((s) => ({ notebooks: s.notebooks })),
  );

  const { pages } = usePages(useShallow((s) => ({ pages: s.pages })));

  // 数据管理状态
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [format, setFormat] = useState<ExportOptions["format"]>("md");

  const dataOperation = useSettingsDataOperation();
  const [resetInput, setResetInput] = useState("");
  const [clearHistory, setClearHistory] = useState(false);
  const [clearAiChats, setClearAiChats] = useState(false);

  const notebookList = sortNotebooksByOrder(notebooks).filter(
    (n) => n.source !== "local-folder",
  );

  const { createNotebook } = useNotebooks(
    useShallow((s) => ({ createNotebook: s.createNotebook })),
  );

  const resetPhrase = uiText("iUnderstandTheRisks_438d");

  const canReset = resetInput.trim() === resetPhrase;

  const toggleNotebook = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    if (selectedIds.length === notebookList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notebookList.map((n) => n.id));
    }
  };
  return {
    open,
    onOpenChange,
    activeTab,
    onTabChange,
    sidebarContainer,
    mainContainer,
    hasOpened,
    setHasOpened,
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    ai,
    setAIEnabled,
    setAIReadGlobalPrompt,
    setAIReadLocalSkills,
    setAISelectedModelId,
    saveAICustomConfig,
    privacy,
    setAutoOpenLastNote,
    singleTabMode,
    showRecentInSearch,
    setShowRecentInSearch,
    closeTabShortcut,
    setCloseTabShortcut,
    searchPanelCloseShortcut,
    setSearchPanelCloseShortcut,
    appShortcuts,
    setAppShortcut,
    resetAppShortcuts,
    customFonts,
    setCustomFont,
    uiFontSize,
    setUIFontSize,
    editorFontSize,
    increaseEditorFontSize,
    decreaseEditorFontSize,
    notebookDropdownHoverExpand,
    setNotebookDropdownHoverExpand,
    localFolderFileManager,
    setLocalFolderFileManager,
    localFolderExternalEditor,
    setLocalFolderExternalEditor,
    localFolderTerminal,
    setLocalFolderTerminal,
    localFolderHiddenFolders,
    setLocalFolderHiddenFolders,
    notebooks,
    pages,
    selectedIds,
    setSelectedIds,
    format,
    setFormat,
    ...dataOperation,
    resetInput,
    setResetInput,
    clearHistory,
    setClearHistory,
    clearAiChats,
    setClearAiChats,
    notebookList,
    createNotebook,
    resetPhrase,
    canReset,
    toggleNotebook,
    selectAll,
  };
}
