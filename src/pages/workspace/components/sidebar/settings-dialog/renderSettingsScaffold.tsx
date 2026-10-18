import { SettingsAppearance } from "../SettingsAppearance";
import { SettingsGeneral } from "../SettingsGeneral";
import { SettingsShortcuts } from "../settings/SettingsShortcuts";
import { SettingsLocalFolder } from "../SettingsLocalFolder";
import { SettingsGitSync } from "../settings/SettingsGitSync";
import { SettingsDataPanel } from "../settings/SettingsDataPanel";
import { SettingsFeedback } from "../settings/SettingsFeedback";
import { SettingsAI } from "../SettingsAI";
import { SettingsScaffold } from "../settings/SettingsScaffold";
import { useSettings } from "@/stores/useSettings";
import { effectiveSingleTabMode } from "@/lib/tabMode";
import type { useSettingsResetActions } from "./useSettingsResetActions";
import { SETTINGS_TABS } from "./shared";
import { WorkspaceViewActivity } from "../../WorkspaceViewActivity";
import type { GitAvailability } from "../settings/useGitAvailability";

export function renderSettingsScaffold(
  context: ReturnType<typeof useSettingsResetActions>,
  gitAvailability: GitAvailability,
) {
  const {
    open,
    onOpenChange,
    activeTab,
    onTabChange,
    sidebarContainer,
    mainContainer,
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
    selectedIds,
    format,
    setFormat,
    exporting,
    importing,
    onResetDialogOpenChange,
    notebookList,
    toggleNotebook,
    selectAll,
    handleExport,
    handleImport,
    handleReset,
  } = context;
  return (
    <SettingsScaffold
      activeTab={activeTab}
      onTabChange={onTabChange}
      onClose={() => onOpenChange(false)}
      tabs={gitAvailability === "ready" ? SETTINGS_TABS : SETTINGS_TABS.filter((tab) => tab.id !== "git-sync")}
      sidebarContainer={sidebarContainer}
      mainContainer={mainContainer}
      visible={open}
      feedbackBanner={null}

    >
      <WorkspaceViewActivity keepAlive={open} visible={open && activeTab === "general"}>
        <div className="settings-groups">
          <SettingsGeneral
            autoOpenLastNote={privacy.autoOpenLastNote}
            setAutoOpenLastNote={setAutoOpenLastNote}
            showRecentInSearch={showRecentInSearch}
            setShowRecentInSearch={setShowRecentInSearch}
            notebookDropdownHoverExpand={notebookDropdownHoverExpand}
            setNotebookDropdownHoverExpand={setNotebookDropdownHoverExpand}
          />
        </div>
      </WorkspaceViewActivity>

      <WorkspaceViewActivity keepAlive={open} visible={open && activeTab === "shortcuts"}>
        <div className="settings-groups">
          <SettingsShortcuts
            closeTabShortcut={closeTabShortcut}
            setCloseTabShortcut={setCloseTabShortcut}
            searchPanelCloseShortcut={searchPanelCloseShortcut}
            setSearchPanelCloseShortcut={setSearchPanelCloseShortcut}
            appShortcuts={appShortcuts}
            setAppShortcut={setAppShortcut}
            resetAppShortcuts={resetAppShortcuts}
            singleTabMode={effectiveSingleTabMode(singleTabMode)}
          />
        </div>
      </WorkspaceViewActivity>

      <WorkspaceViewActivity keepAlive={open} visible={open && activeTab === "local-folder"}>
        <div className="settings-groups">
          <SettingsLocalFolder
            visible={open && activeTab === "local-folder"}
            localFolderFileManager={localFolderFileManager}
            setLocalFolderFileManager={setLocalFolderFileManager}
            localFolderExternalEditor={localFolderExternalEditor}
            setLocalFolderExternalEditor={setLocalFolderExternalEditor}
            localFolderTerminal={localFolderTerminal}
            setLocalFolderTerminal={setLocalFolderTerminal}
            localFolderHiddenFolders={localFolderHiddenFolders}
            setLocalFolderHiddenFolders={setLocalFolderHiddenFolders}
          />
        </div>
      </WorkspaceViewActivity>

      <WorkspaceViewActivity keepAlive={open} visible={open && activeTab === "appearance"}>
        <SettingsAppearance
          theme={theme}
          setTheme={setTheme}
          accentColor={accentColor}
          setAccentColor={setAccentColor}
          customFonts={customFonts}
          setCustomFont={setCustomFont}
          uiFontSize={uiFontSize}
          setUIFontSize={setUIFontSize}
          editorFontSize={editorFontSize}
          increaseEditorFontSize={increaseEditorFontSize}
          decreaseEditorFontSize={decreaseEditorFontSize}
        />
      </WorkspaceViewActivity>

      <WorkspaceViewActivity keepAlive={open} visible={open && activeTab === "ai"}>
        <div className="settings-groups">
          <SettingsAI
            visible={open && activeTab === "ai"}
            ai={ai}
            enabled={ai.enabled}
            setEnabled={setAIEnabled}
            setReadGlobalPrompt={setAIReadGlobalPrompt}
            setReadLocalSkills={setAIReadLocalSkills}
            selectedModelId={ai.selectedModelId}
            setSelectedModelId={setAISelectedModelId}
            saveCustomConfig={saveAICustomConfig}
          />
        </div>
      </WorkspaceViewActivity>

      <WorkspaceViewActivity keepAlive={open} visible={open && activeTab === "git-sync" && gitAvailability === "ready"}>
        <SettingsGitSync visible={open && activeTab === "git-sync"} />
      </WorkspaceViewActivity>

      <WorkspaceViewActivity keepAlive={open} visible={open && activeTab === "data"}>
        <div className="settings-groups">
          <SettingsDataPanel
            active={open && activeTab === "data"}
            importing={importing}
            onImport={handleImport}
            selectedIds={selectedIds}
            notebookList={notebookList}
            onToggleNotebook={toggleNotebook}
            onSelectAll={selectAll}
            format={format}
            onFormatChange={setFormat}
            exporting={exporting}
            onExport={handleExport}
            onOpenResetDialog={() => onResetDialogOpenChange(true)}
            onRestartGuide={() => {
              onOpenChange(false);
              useSettings.setState({ setupGuideOpen: true });
            }}
            onResetAndImport={handleReset}
          />
        </div>
      </WorkspaceViewActivity>

      <WorkspaceViewActivity keepAlive={open} visible={open && activeTab === "feedback"}>
        <SettingsFeedback />
      </WorkspaceViewActivity>
    </SettingsScaffold>
  );
}
