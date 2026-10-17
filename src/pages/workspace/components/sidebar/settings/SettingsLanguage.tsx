import { useState, useSyncExternalStore } from "react";
import { Globe } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { i18nYaml, useMessages, getLanguageSnapshot, subscribeLanguage, setLanguagePreference, type LanguagePreference } from "@/i18n";

const messages = i18nYaml<"src/pages/workspace/components/sidebar/settings/SettingsLanguage.tsx#messages:1">`
zh-Hans:
  language: 应用语言
  system: 跟随系统
  restart: 下次完整启动生效
  saveFailed: 无法保存语言设置，请重试。
  readFailed: 语言设置文件无法读取，原文件已保留。请修复该文件后重新启动应用。
  conflict: 语言设置文件已在外部更改，请重新启动应用后重试。
en:
  language: App language
  system: Follow system
  restart: Applies after quitting and reopening the app
  saveFailed: Couldn't save the language setting. Please try again.
  readFailed: Couldn't read the language settings file. The original file has been preserved. Repair the file and restart the app.
  conflict: The language settings file was changed outside the app. Restart the app and try again.
`;

export function SettingsLanguage() {
  const t = useMessages(messages);
  const snapshot = useSyncExternalStore(subscribeLanguage, getLanguageSnapshot, getLanguageSnapshot);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const errorCode = failure || snapshot.error;
  const error = errorCode?.includes("language.readFailed") ? t("readFailed")
    : errorCode?.includes("language.conflict") ? t("conflict") : errorCode ? t("saveFailed") : "";
  const change = async (value: LanguagePreference) => {
    setSaving(true);
    setFailure("");
    try { await setLanguagePreference(value); }
    catch (error) { setFailure(error instanceof Error ? error.message : "language.saveFailed"); }
    finally { setSaving(false); }
  };
  return (
    <div>
      <div className="goose-settings-option-row flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Globe className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <Label htmlFor="app-language">{t("language")}</Label>
          <span id="app-language-restart" className="text-sm text-muted-foreground">{t("restart")}</span>
        </div>
        <Select id="app-language" className="w-auto max-w-full" value={snapshot.preference}
          aria-describedby="app-language-restart" aria-invalid={Boolean(error)}
          disabled={saving || !window.gooseLanguage} onChange={(event) => void change(event.target.value as LanguagePreference)}>
          <option value="system">{t("system")}</option>
          <option value="zh-Hans" lang="zh-Hans">简体中文</option>
          <option value="en" lang="en">English</option>
        </Select>
      </div>
      {error ? <div role="alert" className="mt-2 px-4 text-sm text-destructive">{error}</div> : null}
    </div>
  );
}
