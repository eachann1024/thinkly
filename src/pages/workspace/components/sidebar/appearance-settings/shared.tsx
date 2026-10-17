import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/appearance-settings/shared.tsx#localMessages:1">`
zh-Hans:
  ocean_212e: "海蓝"
  iris_8a32: "鸢尾"
  pine_3fa7: "松绿"
  vermilion_2107: "朱砂"
  berry_10a3: "莓红"
  grape_05b1: "葡萄"
  leaf_461c: "叶脉"
  earlyAutumn_c4e4: "浅秋"
  paleCreamAndWarmWhiteLike_7eae: "浅奶油黄与暖白纸面，像秋日里的一点淡淡日光。"
  wheatPaper_013e: "麦笺"
  softWheatGrayAndIvoryLike_a5bb: "灰麦黄与米白纸面，像铅笔画在一张安静的素描纸上。"
  flatWarmPaperWithTerracottaAccents_b6c6: "暖陶色点缀的平涂暖纸面，克制的 Claude 风格。"
  serif_11e5: "衬线体"
  monospace_5226: "等宽体"
  defaultLayoutForNewNotes_3db8: "新笔记默认布局"
  defaultLayout_64ce: "默认布局"
  fullWidth_dc39: "全宽"
  standard_544f: "标准"
en:
  ocean_212e: "Ocean"
  iris_8a32: "Iris"
  pine_3fa7: "Pine"
  vermilion_2107: "Vermilion"
  berry_10a3: "Berry"
  grape_05b1: "Grape"
  leaf_461c: "Leaf"
  earlyAutumn_c4e4: "Early Autumn"
  paleCreamAndWarmWhiteLike_7eae: "Pale cream and warm white, like a little autumn sunlight."
  wheatPaper_013e: "Wheat Paper"
  softWheatGrayAndIvoryLike_a5bb: "Soft wheat gray and ivory, like pencil on a quiet sketchbook page."
  flatWarmPaperWithTerracottaAccents_b6c6: "Flat, warm paper with terracotta accents, in a restrained Claude-inspired style."
  serif_11e5: "Serif"
  monospace_5226: "Monospace"
  defaultLayoutForNewNotes_3db8: "Default layout for new notes"
  defaultLayout_64ce: "Default layout"
  fullWidth_dc39: "Full width"
  standard_544f: "Standard"
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import { useSettings } from "@/stores/useSettings";
import { type CSSProperties } from "react";
import type { UIFontSize } from "@/stores/settings/types";
import type { AccentColor } from "@/stores/useSettings";
import { SelectableCard } from "@/components/ui/selectable-card";
import { resolveAccentRuntimeTokens } from "@/lib/accentColor";
import { SettingsSectionCard } from "../settings/SettingsSectionCard";

export interface SettingsAppearanceProps {
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  accentColor: AccentColor;
  setAccentColor: (accentColor: AccentColor) => void;
  customFonts: Record<
    "default" | "serif" | "mono",
    { label: string | null; font: string | null }
  >;
  setCustomFont: (
    type: "default" | "serif" | "mono",
    font: string | null,
  ) => void;
  uiFontSize: UIFontSize;
  setUIFontSize: (size: UIFontSize) => void;
  editorFontSize: number;
  increaseEditorFontSize: () => void;
  decreaseEditorFontSize: () => void;
  section?: "all" | "appearance" | "reading";
  showPreview?: boolean;
}

export type AccentOption = {
  value: AccentColor;
  label: string;
  previewLight: string;
  previewDark: string;
  lightSurface: string;
  darkSurface: string;
  lightFocus: string;
  darkFocus: string;
  fullTheme?: string;
  pro?: boolean;
};

const accentOptionDefinitions: Pick<AccentOption, "value" | "label" | "fullTheme" | "pro">[] = [
  {
    value: "ocean",
    label: uiText("ocean_212e"),
  },
  {
    value: "iris",
    label: uiText("iris_8a32"),
  },
  {
    value: "pine",
    label: uiText("pine_3fa7"),
  },
  {
    value: "coral",
    label: uiText("vermilion_2107"),
  },
  {
    value: "rose",
    label: uiText("berry_10a3"),
  },
  {
    value: "grape",
    label: uiText("grape_05b1"),
  },
  {
    value: "mono",
    label: uiText("leaf_461c"),
    pro: true,
  },
  {
    value: "amber",
    label: uiText("earlyAutumn_c4e4"),
    fullTheme: uiText("paleCreamAndWarmWhiteLike_7eae"),
    pro: true,
  },
  {
    value: "wheat",
    label: uiText("wheatPaper_013e"),
    fullTheme: uiText("softWheatGrayAndIvoryLike_a5bb"),
    pro: true,
  },
  {
    value: "claude",
    label: "Claude",
    fullTheme: uiText("flatWarmPaperWithTerracottaAccents_b6c6"),
    pro: true,
  },
];

export const accentOptions: AccentOption[] = accentOptionDefinitions.map((option) => {
  const light = resolveAccentRuntimeTokens(option.value, false);
  const dark = resolveAccentRuntimeTokens(option.value, true);
  return {
    ...option,
    previewLight: light["--goose-accent-solid"],
    previewDark: dark["--goose-accent-solid"],
    lightSurface: light["--goose-interactive-selected"],
    darkSurface: dark["--goose-interactive-selected"],
    lightFocus: light["--goose-accent-outline-focus"],
    darkFocus: dark["--goose-accent-outline-focus"],
  };
});

export type AccentOptionStyle = CSSProperties & {
  "--goose-accent-option-light-surface": string;
  "--goose-accent-option-light-fg": string;
  "--goose-accent-option-dark-surface": string;
  "--goose-accent-option-dark-fg": string;
  "--goose-accent-option-light-focus": string;
  "--goose-accent-option-dark-focus": string;
};

export const defaultLabels = { serif: uiText("serif_11e5"), mono: uiText("monospace_5226") };

export const APPEARANCE_OPTION_ROW_CLASS =
  "goose-settings-option-row";

export function EditorLayoutSettings() {
  const layout = useSettings((state) => state.defaultPageLayout);
  return (
    <SettingsSectionCard
      title={uiText("defaultLayoutForNewNotes_3db8")}
    >
      <div
        role="group"
        aria-label={uiText("defaultLayout_64ce")}
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {(
          [
            ["full", uiText("fullWidth_dc39")],
            ["standard", uiText("standard_544f")],
          ] as const
        ).map(([value, label]) => (
          <SelectableCard
            key={value}
            type="button"
            selected={layout === value}
            aria-pressed={layout === value}
            onClick={() => useSettings.setState({ defaultPageLayout: value })}
            className="flex flex-col gap-3 p-3"
          >
            <span
              aria-hidden="true"
              className="flex h-14 w-full gap-2 rounded-md border border-current/20 bg-background/50 p-2"
            >
              <span
                className={cn(
                  "flex flex-col gap-1.5",
                  value === "standard" ? "mx-auto w-2/3" : "flex-1",
                )}
              >
                <span className="h-1 w-1/2 rounded bg-current/30" />
                <span className="h-1 w-full rounded bg-current/20" />
                <span className="h-1 w-4/5 rounded bg-current/20" />
              </span>
            </span>
            <span className="flex w-full items-center justify-between text-sm font-medium">
              {label}
              {layout === value && (
                <GooseIcons.Check className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
          </SelectableCard>
        ))}
      </div>
    </SettingsSectionCard>
  );
}
