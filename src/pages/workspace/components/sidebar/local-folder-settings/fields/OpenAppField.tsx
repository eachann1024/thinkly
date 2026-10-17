import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/local-folder-settings/fields/OpenAppField.tsx#localMessages:1">`
zh-Hans:
  custom_f1d4: "自定义"
  applicationName: "{{title}}名称"
en:
  custom_f1d4: "Custom"
  applicationName: "{{title}} name"
`;
const uiText = createTranslator(localMessages);
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as GooseIcons from "@/components/ui/icons";
import {
  type OpenAppFieldProps,
  SYSTEM_VALUE,
  CUSTOM_VALUE,
  SETTINGS_OPTION_ROW_CLASS,
} from "./localFolderSettingsConfig";

export function OpenAppField({
  id,
  title,
  icon: Icon,
  value,
  onChange,
  defaultLabel,
  customPlaceholder,
  options,
  systemIds,
}: OpenAppFieldProps) {
  const trimmedValue = value.trim();
  const matchedOption = useMemo(
    () => options.find((option) => option.appName === trimmedValue),
    [options, trimmedValue],
  );
  const isCustomValue = Boolean(trimmedValue && !matchedOption);
  const [customActive, setCustomActive] = useState(isCustomValue);

  useEffect(() => {
    if (isCustomValue) {
      setCustomActive(true);
      return;
    }
    if (trimmedValue && matchedOption) {
      setCustomActive(false);
    }
  }, [isCustomValue, matchedOption, trimmedValue]);

  const selectedValue =
    customActive && !trimmedValue
      ? CUSTOM_VALUE
      : !trimmedValue
        ? SYSTEM_VALUE
        : (matchedOption?.appName ?? CUSTOM_VALUE);
  const selectedLabel =
    customActive && !trimmedValue
      ? uiText("custom_f1d4")
      : !trimmedValue
        ? defaultLabel
        : (matchedOption?.label ?? trimmedValue);
  const showCustomInput = customActive || isCustomValue;
  const defaultIcon = options.find((option) => systemIds?.has(option.id))?.icon;
  const selectedIcon =
    matchedOption?.icon ?? (!trimmedValue ? defaultIcon : undefined);
  const appIcon = (icon?: string) =>
    icon ? (
      <img src={icon} alt="" className="h-4 w-4 shrink-0 object-contain" />
    ) : (
      <Icon
        className="h-4 w-4 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
      />
    );

  const handleSelect = (nextValue: string) => {
    if (nextValue === SYSTEM_VALUE) {
      setCustomActive(false);
      onChange("");
      return;
    }
    if (nextValue === CUSTOM_VALUE) {
      setCustomActive(true);
      return;
    }
    setCustomActive(false);
    onChange(nextValue);
  };

  return (
    <div className={`space-y-3 p-4 ${SETTINGS_OPTION_ROW_CLASS}`}>
      <div className="settings-local-folder-pick-row flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Icon
              className="h-4 w-4 shrink-0 text-muted-foreground"
              strokeWidth={1.75}
            />
            <Label id={`${id}-label`} htmlFor={id} className="cursor-pointer">
              {title}
            </Label>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              size="sm"
              aria-labelledby={`${id}-label ${id}-value`}
              className="min-w-36 max-w-56 shrink-0 justify-between rounded-[var(--goose-control-radius)] text-left font-normal"
            >
              <span className="flex min-w-0 items-center gap-2">
                {appIcon(selectedIcon)}
                <span id={`${id}-value`} className="truncate">
                  {selectedLabel}
                </span>
              </span>
              <GooseIcons.ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuRadioGroup
              value={selectedValue}
              onValueChange={handleSelect}
            >
              <DropdownMenuRadioItem value={SYSTEM_VALUE} hideIndicator>
                {appIcon(defaultIcon)}
                <span className="truncate">{defaultLabel}</span>
              </DropdownMenuRadioItem>
              {options
                .filter((option) => !systemIds?.has(option.id))
                .map((option) => (
                  <DropdownMenuRadioItem
                    key={option.id}
                    value={option.appName}
                    hideIndicator
                  >
                    {appIcon(option.icon)}
                    <span className="truncate">{option.label}</span>
                  </DropdownMenuRadioItem>
                ))}
              <DropdownMenuRadioItem value={CUSTOM_VALUE} hideIndicator>
                {appIcon()}
                <span>{uiText("custom_f1d4")}</span>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showCustomInput && (
        <div className="pl-7">
          <Input
            id={`${id}-custom`}
            aria-label={uiText("applicationName", { title })}
            value={trimmedValue}
            onChange={(event) => onChange(event.target.value)}
            onBlur={(event) => onChange(event.target.value.trim())}
            placeholder={customPlaceholder}
            className="h-9 text-sm"
          />
        </div>
      )}
    </div>
  );
}
