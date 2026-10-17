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
`;
const uiText = createTranslator(localMessages);
import { ListRow } from "@/components/ui/list-row";
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
    <div className={cn("flex gap-[var(--goose-list-row-gap)]", compact ? "p-0.5" : "p-1")}>
      {defaultFonts.map((font) => {
        const customFont = customFonts[font.value];
        const label = font.label;
        const fontName = customFont.font || font.defaultFont;
        const selected = (value ?? "default") === font.value;

        return (
          <ListRow
            key={font.value}
            type="button"
            aria-pressed={selected}
            data-selected={selected || undefined}
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
              "goose-list-row goose-accent-selection flex-1 shadow-none ",
              compact ? "px-2 py-1.5" : "px-3 py-2",
              "flex flex-col items-center justify-center border-2 border-transparent",
            )}
          >
            <span
              className={cn(
                "leading-none",
                compact ? "mb-0.5 text-xl" : "mb-1 text-2xl",
              )}
              style={{ fontFamily: toCssFontFamily(fontName) }}
            >
              Ag
            </span>
            <span
              className="text-xs"
              style={{ fontFamily: toCssFontFamily(fontName) }}
            >
              {label}
            </span>
          </ListRow>
        );
      })}
    </div>
  );
}
