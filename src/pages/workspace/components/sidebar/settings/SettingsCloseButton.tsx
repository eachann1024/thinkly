import { createTranslator, i18nYaml, useLocale } from "@/i18n";
import { IconButton } from "@/components/ui/icon-button";
import { X } from "@/components/ui/icons";

const messages = i18nYaml<"src/pages/workspace/components/sidebar/settings/SettingsCloseButton.tsx#messages:1">`
zh-Hans:
  closeSettings: "关闭设置"
en:
  closeSettings: "Close settings"
ja:
  closeSettings: "設定を閉じる"
`;
const t = createTranslator(messages);

export function SettingsCloseButton({
  onClose,
  className,
}: {
  onClose: () => void;
  className?: string;
}) {
  useLocale();
  return (
    <IconButton
      type="button"
      size="icon"
      tone="muted"
      className={className}
      aria-label={t("closeSettings")}
      onClick={onClose}
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </IconButton>
  );
}
