import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/shared/FontSelector.tsx#localMessages:1">`
zh-Hans:
  default: "默认"
  serif: "衬线体"
  monospace: "等宽体"
en:
  default: "Default"
  serif: "Serif"
  monospace: "Monospace"
ja:
  default: "デフォルト"
  serif: "明朝体"
  monospace: "等幅"
`;
const uiText = createTranslator(localMessages);
import type { Page } from "@/types";
import {
  DEFAULT_FONT_NAMES,
  ensureEditorFontAvailable,
  toCssFontFamily,
} from "@/lib/fontLoader";

interface FontSelectorProps {
  value: Page["fontFamily"];
  onChange: (value: Page["fontFamily"]) => void;
  compact?: boolean;
}

const defaultFonts = [
  {
    value: "default" as const,
    get label() { return uiText("default"); },
    defaultFont: DEFAULT_FONT_NAMES.default,
  },
  {
    value: "serif" as const,
    get label() { return uiText("serif"); },
    defaultFont: DEFAULT_FONT_NAMES.serif,
  },
  {
    value: "mono" as const,
    get label() { return uiText("monospace"); },
    defaultFont: DEFAULT_FONT_NAMES.mono,
  },
];

export function FontSelector({
  value,
  onChange,
  compact = false,
}: FontSelectorProps) {
  useLocale();
  const { customFonts } = useSettings();

  const selectFont = (fontFamily: Page["fontFamily"]) => {
    if (fontFamily === value) return;
    onChange(fontFamily);
    void ensureEditorFontAvailable(fontFamily, customFonts);
  };

  return (
    <div
      role="group"
      className={cn(
        "goose-segmented-tray grid w-full grid-cols-3 gap-0.5 p-[3px]",
      )}
    >
      {defaultFonts.map((font) => {
        const customFont = customFonts[font.value];
        const fontFamily = toCssFontFamily(customFont.font || font.defaultFont);
        const selected = (value ?? "default") === font.value;

        return (
          <button
            key={font.value}
            type="button"
            aria-pressed={selected}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              selectFont(font.value);
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              selectFont(font.value);
            }}
            className={cn(
              "goose-segmented-option flex min-w-0 flex-col items-center justify-center",
              compact ? "h-16 gap-1.5" : "h-[72px] gap-2",
            )}
          >
            <span
              className={cn("leading-none", compact ? "text-2xl" : "text-[28px]")}
              style={{ fontFamily }}
            >
              Ag
            </span>
            <span className="truncate text-xs leading-none">{font.label}</span>
          </button>
        );
      })}
    </div>
  );
}
