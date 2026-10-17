import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/local-folder-settings/fields/HiddenFoldersField.tsx#localMessages:1">`
zh-Hans:
  enterAFolderName_4a86: "请输入文件夹名称。"
  thisFolderIsAlreadyHidden_1674: "该文件夹已在隐藏列表中。"
  hiddenFolders_0e77: "隐藏文件夹"
  hideAllFoldersWithMatchingNames_2052: "侧栏隐藏所有同名文件夹，不删除本地文件。"
  resetToDefaults_7468: "恢复默认"
  noHiddenFolders_8f82: "暂无隐藏文件夹"
  builtInRulesAlwaysHidden_74ff: "预置规则 · 始终隐藏"
  removeFolder: "移除 {{folder}}"
  addHiddenFolder_50c3: "添加隐藏文件夹"
  folderName_a984: "文件夹名称"
  eGObsidian_55c9: "例如 .obsidian"
  add_b58c: "添加"
  display: "显示"
  hiddenCount: "已隐藏 {{count}} 项"
en:
  enterAFolderName_4a86: "Enter a folder name."
  thisFolderIsAlreadyHidden_1674: "This folder is already hidden."
  hiddenFolders_0e77: "Hidden folders"
  hideAllFoldersWithMatchingNames_2052: "Hide all folders with matching names in the sidebar. Local files are not deleted."
  resetToDefaults_7468: "Reset to defaults"
  noHiddenFolders_8f82: "No hidden folders"
  builtInRulesAlwaysHidden_74ff: "Built-in rules · Always hidden"
  removeFolder: "Remove {{folder}}"
  addHiddenFolder_50c3: "Add hidden folder"
  folderName_a984: "Folder name"
  eGObsidian_55c9: "e.g. .obsidian"
  add_b58c: "Add"
  display: "Display"
  hiddenCount: "Hidden items: {{count}}"
`;
const uiText = createTranslator(localMessages);
import { Disclosure, DisclosureSummary } from "@/components/ui/disclosure";
import { IconButton } from "@/components/ui/icon-button";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import * as GooseIcons from "@/components/ui/icons";
import { SettingsSectionCard } from "../../settings/SettingsSectionCard";
import {
  DEFAULT_HIDDEN_FOLDERS,
  SETTINGS_OPTION_ROW_CLASS,
  type HiddenFoldersFieldProps,
} from "./localFolderSettingsConfig";

export function HiddenFoldersField({
  folders,
  onChange,
}: HiddenFoldersFieldProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");

  const addFolder = (raw: string) => {
    const name = raw.trim();
    if (!name) {
      setError(uiText("enterAFolderName_4a86"));
      return;
    }
    if (folders.includes(name)) {
      setError(uiText("thisFolderIsAlreadyHidden_1674"));
      return;
    }
    onChange([...folders, name]);
    setInputValue("");
    setError("");
  };

  const removeFolder = (name: string) => {
    onChange(folders.filter((f) => f !== name));
  };

  const resetToDefault = () => {
    onChange([...DEFAULT_HIDDEN_FOLDERS]);
    setError("");
  };

  const isDefault =
    JSON.stringify(folders) === JSON.stringify(DEFAULT_HIDDEN_FOLDERS);

  return (
    <SettingsSectionCard
      title={uiText("display")}
      actions={
        <span className="text-sm text-muted-foreground">
          {uiText("hiddenCount", { count: folders.length })}
        </span>
      }
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-4 p-4 ${SETTINGS_OPTION_ROW_CLASS}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <GooseIcons.EyeOff
              className="h-4 w-4 shrink-0 text-muted-foreground"
              strokeWidth={1.75}
            />
            <Label>{uiText("hiddenFolders_0e77")}</Label>
          </div>
          <p className="mt-1 pl-7 text-sm leading-relaxed text-muted-foreground">
            {uiText("hideAllFoldersWithMatchingNames_2052")}</p>
        </div>
        {!isDefault && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={resetToDefault}
          >
            {uiText("resetToDefaults_7468")}</Button>
        )}
      </div>

      {folders.length === 0 && (
        <p className={`p-4 text-sm text-muted-foreground ${SETTINGS_OPTION_ROW_CLASS}`}>
          {uiText("noHiddenFolders_8f82")}</p>
      )}
      {folders.map((folder) => {
        const isDefaultFolder = DEFAULT_HIDDEN_FOLDERS.includes(folder);
        return (
          <div
            key={folder}
            className={`flex flex-wrap items-center justify-between gap-4 p-4 ${SETTINGS_OPTION_ROW_CLASS}`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <GooseIcons.FolderClosed
                className="h-4 w-4 shrink-0 text-muted-foreground"
                strokeWidth={1.75}
              />
              <span className="min-w-0 break-all text-sm font-medium">
                {folder}
              </span>
            </div>
            {isDefaultFolder ? (
              <span className="text-sm text-muted-foreground">
                {uiText("builtInRulesAlwaysHidden_74ff")}</span>
            ) : (
              <IconButton
                size="sm"
                tone="muted"
                type="button"
                onClick={() => removeFolder(folder)}
                aria-label={uiText("removeFolder", { folder })}
              >
                <GooseIcons.X className="h-4 w-4" />
              </IconButton>
            )}
          </div>
        );
      })}

      <Disclosure className={`p-4 ${SETTINGS_OPTION_ROW_CLASS}`}>
        <DisclosureSummary className="flex cursor-pointer list-none items-center gap-3 rounded-md text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
          <GooseIcons.Plus
            className="h-4 w-4 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
          />
          {uiText("addHiddenFolder_50c3")}</DisclosureSummary>
        <form
          className="space-y-2 pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            addFolder(inputValue);
          }}
        >
          <Label
            htmlFor="local-folder-hidden-folder-input"
            className="text-sm"
          >
            {uiText("folderName_a984")}</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="local-folder-hidden-folder-input"
              value={inputValue}
              onChange={(event) => {
                setInputValue(event.target.value);
                setError("");
              }}
              placeholder={uiText("eGObsidian_55c9")}
              className="h-9 min-w-36 flex-1 text-sm"
            />
            <Button type="submit" size="sm" className="h-9 shrink-0">
              {uiText("add_b58c")}</Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      </Disclosure>
    </SettingsSectionCard>
  );
}
