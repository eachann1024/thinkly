import { Kbd } from "@/components/ui/kbd";
import {
  getPlatformKind,
  type PlatformKind,
} from "@/lib/utils";
import { SETTINGS_OPTION_ROW_CLASS } from "./shortcutConfig";

export function KbdShortcut({
  shortcut,
  platform = getPlatformKind(),
}: {
  shortcut: string;
  platform?: PlatformKind;
}) {
  // 范围键仍需格式化 Mod，避免直接把内部存储值展示给用户。
  if (shortcut.includes("~")) {
    return (
      <Kbd shortcut={shortcut} platform={platform} variant="chip" />
    );
  }
  const parts = shortcut.split("+");
  return (
    <span className="inline-flex items-center gap-0.5">
      {parts.map((part, i) => (
        <Kbd
          key={`${platform}-${part}-${i}`}
          shortcut={part}
          platform={platform}
          variant="chip"
        />
      ))}
    </span>
  );
}

export function FixedShortcutRow({
  label,
  shortcut,
  platform,
}: {
  label: string;
  shortcut: string;
  platform: PlatformKind;
}) {
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 ${SETTINGS_OPTION_ROW_CLASS}`}
    >
      <span className="min-w-0 text-sm text-muted-foreground">{label}</span>
      <span className="justify-self-end whitespace-nowrap">
        <KbdShortcut shortcut={shortcut} platform={platform} />
      </span>
    </div>
  );
}
