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
    label: "海蓝",
  },
  {
    value: "iris",
    label: "鸢尾",
  },
  {
    value: "pine",
    label: "松绿",
  },
  {
    value: "coral",
    label: "朱砂",
  },
  {
    value: "rose",
    label: "莓红",
  },
  {
    value: "grape",
    label: "葡萄",
  },
  {
    value: "mono",
    label: "叶脉",
    pro: true,
  },
  {
    value: "amber",
    label: "浅秋",
    fullTheme: "浅奶油黄与暖白纸面，像秋日里的一点淡淡日光。",
    pro: true,
  },
  {
    value: "wheat",
    label: "麦笺",
    fullTheme: "灰麦黄与米白纸面，像铅笔画在一张安静的素描纸上。",
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

export const defaultLabels = { serif: "衬线体", mono: "等宽体" };

export const APPEARANCE_OPTION_ROW_CLASS =
  "goose-settings-option-row";

export function EditorLayoutSettings() {
  const layout = useSettings((state) => state.defaultPageLayout);
  return (
    <SettingsSectionCard
      title="编辑布局"
      description="新笔记的默认排版宽度；单篇笔记可在右上角菜单单独调整。"
    >
      <div
        role="group"
        aria-label="默认布局"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {(
          [
            ["full", "全宽", "铺满编辑窗口，适合长表格与宽文档"],
            ["standard", "标准", "居中自适应留白，提供舒适阅读节奏"],
          ] as const
        ).map(([value, label, description]) => (
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
            <span className="text-xs text-muted-foreground">{description}</span>
          </SelectableCard>
        ))}
      </div>
    </SettingsSectionCard>
  );
}
