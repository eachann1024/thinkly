import { useState, useSyncExternalStore } from "react";
import { ChevronDown, Globe } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { i18nYaml, useMessages, getLanguageSnapshot, subscribeLanguage, setLanguagePreference, type LanguagePreference } from "@/i18n";

const messages = i18nYaml<"src/pages/workspace/components/sidebar/settings/SettingsLanguage.tsx#messages:1">`
zh-Hans:
  language: 应用语言
  system: 跟随系统
  saveFailed: 无法保存语言设置，请重试。
  readFailed: 语言设置文件无法读取，原文件已保留。请修复该文件后重新启动应用。
  conflict: 语言设置文件已在外部更改，请重新启动应用后重试。
en:
  language: App language
  system: Follow system
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
  const options = [
    { value: "system", label: t("system") },
    { value: "zh-Hans", label: "简体中文", lang: "zh-Hans" },
    { value: "en", label: "English", lang: "en" },
  ];
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
          <Label id="app-language-label" htmlFor="app-language">{t("language")}</Label>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button id="app-language" type="button" variant="outline" size="sm"
              aria-labelledby="app-language-label app-language-value" aria-invalid={Boolean(error)}
              aria-describedby={error ? "app-language-error" : undefined}
              disabled={saving || !window.gooseLanguage}
              className="min-w-36 max-w-full justify-between font-normal">
              <span id="app-language-value" className="truncate" lang={options.find((option) => option.value === snapshot.preference)?.lang}>
                {options.find((option) => option.value === snapshot.preference)?.label}
              </span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            <DropdownMenuRadioGroup value={snapshot.preference} onValueChange={(value) => { if (!saving) void change(value as LanguagePreference); }}>
              {options.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value} lang={option.lang} disabled={saving}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {error ? <div id="app-language-error" role="alert" className="mt-2 px-4 text-sm text-destructive">{error}</div> : null}
    </div>
  );
}
