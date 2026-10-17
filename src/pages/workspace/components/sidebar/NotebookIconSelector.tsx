import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/NotebookIconSelector.tsx#localMessages:1">`
zh-Hans:
  all_a8b0: "全部"
  notebookIcon_cdc6: "笔记本图标"
  chooseIcon: "选择{{label}}"
  searchIcon: "搜索{{label}}"
  searchIcons_c320: "搜索图标"
  iconCategories_7ee8: "图标分类"
  availableIcons_29dd: "可选图标"
  noMatchingIcons_f8cb: "没有匹配的图标"
  randomizeIcon: "随机选择{{label}}"
  random_3bde: "随机"
  resetIcon: "恢复默认{{label}}"
  resetToDefaults_7468: "恢复默认"
en:
  all_a8b0: "All"
  notebookIcon_cdc6: "Notebook icon"
  chooseIcon: "Choose {{label}}"
  searchIcon: "Search {{label}}"
  searchIcons_c320: "Search icons"
  iconCategories_7ee8: "Icon categories"
  availableIcons_29dd: "Available icons"
  noMatchingIcons_f8cb: "No matching icons"
  randomizeIcon: "Randomize {{label}}"
  random_3bde: "Random"
  resetIcon: "Reset {{label}}"
  resetToDefaults_7468: "Reset to defaults"
ja:
  all_a8b0: "すべて"
  notebookIcon_cdc6: "ノートブックのアイコン"
  chooseIcon: "{{label}}を選択"
  searchIcon: "{{label}}を検索"
  searchIcons_c320: "アイコンを検索"
  iconCategories_7ee8: "アイコンのカテゴリ"
  availableIcons_29dd: "利用可能なアイコン"
  noMatchingIcons_f8cb: "一致するアイコンがありません"
  randomizeIcon: "{{label}}をランダムに選択"
  random_3bde: "ランダム"
  resetIcon: "{{label}}をデフォルトに戻す"
  resetToDefaults_7468: "デフォルトに戻す"
`;
const uiText = createTranslator(localMessages);
import { createElement, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Shuffle } from "lucide-react";
import { RotateCcw, Search } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { resolvePageIcon } from "@/lib/resolvePageIcon";
import {
  filterNotebookIcons,
  getNotebookIconCategory,
  NOTEBOOK_ICON_CATEGORIES,
  NOTEBOOK_ICONS,
} from "./notebook-icons";
import type { NotebookIconFilter } from "./notebook-icons";
import "./notebook-icon-selector.css";

interface NotebookIconSelectorProps {
  value: string;
  defaultIcon: string;
  onChange: (value: string) => void;
  container: HTMLElement | null;
  label?: string;
  compact?: boolean;
}

const categories: ReadonlyArray<{ id: NotebookIconFilter; label: string }> = [
  { id: "all", get label() { return uiText("all_a8b0"); } },
  ...NOTEBOOK_ICON_CATEGORIES,
];

export function NotebookIconSelector({
  value,
  defaultIcon,
  onChange,
  container,
  label = uiText("notebookIcon_cdc6"),
  compact = false,
}: NotebookIconSelectorProps) {
  const locale = useLocale();
  const savedValue = typeof value === "string" ? value : "";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<NotebookIconFilter>("all");
  const [focusedIcon, setFocusedIcon] = useState(savedValue);
  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectorId = useId();
  const resultsId = `${selectorId}-results`;
  const availableIcons = useMemo(
    () => filterNotebookIcons(query, category).filter((icon) => resolvePageIcon(icon.name)),
    [query, category, locale],
  );
  const tabStop = availableIcons.find((icon) => icon.name === focusedIcon)?.name
    ?? availableIcons.find((icon) => icon.name === savedValue)?.name
    ?? availableIcons[0]?.name;
  const currentValue = savedValue || defaultIcon;
  const CurrentIcon = resolvePageIcon(currentValue);
  const textPreviewClass = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(currentValue)
    ? "notebook-icon-selector-preview--emoji"
    : "notebook-icon-selector-preview--text";

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setQuery("");
      setCategory(getNotebookIconCategory(savedValue));
      setFocusedIcon(savedValue);
    }
    setOpen(next);
  };

  const selectIcon = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const focusIcon = (index: number) => {
    const target = iconRefs.current[index];
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const handleIconKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const columns = gridRef.current
      ? getComputedStyle(gridRef.current).gridTemplateColumns.trim().split(/\s+/).length
      : 6;
    const offsets: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
    };
    const nextIndex = event.key === "Home" ? 0
      : event.key === "End" ? availableIcons.length - 1
      : event.key in offsets ? index + offsets[event.key] : undefined;
    if (nextIndex === undefined) return;
    event.preventDefault();
    focusIcon(Math.max(0, Math.min(availableIcons.length - 1, nextIndex)));
  };

  const handleRandom = () => {
    const candidates = NOTEBOOK_ICONS.filter(
      (icon) => icon.name !== savedValue && resolvePageIcon(icon.name),
    );
    if (!candidates.length) return;
    const icon = candidates[Math.floor(Math.random() * candidates.length)];
    setQuery("");
    setCategory(icon.category);
    setFocusedIcon(icon.name);
    onChange(icon.name);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          contentStyle="preserve"
          className="notebook-icon-selector-trigger"
          aria-label={uiText("chooseIcon", { label })}
          title={currentValue}
          style={compact ? { width: "1.5em", height: "1.5em", minWidth: "1.5em", padding: 0, border: 0, borderRadius: 4, background: "transparent", color: "inherit" } : undefined}
        >
          <span
            aria-hidden="true"
            className={`notebook-icon-selector-preview ${CurrentIcon ? "" : textPreviewClass}`}
            style={compact ? { width: "1em", height: "1em", fontSize: "1em" } : undefined}
          >
            {CurrentIcon ? createElement(CurrentIcon, compact ? { style: { width: "1em", height: "1em" } } : {}) : currentValue}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        variant="menu"
        className="notebook-icon-selector"
        aria-label={uiText("chooseIcon", { label })}
        align="start"
        side="bottom"
        collisionPadding={12}
        container={container}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus({ preventScroll: true });
        }}
      >
        <div className="notebook-icon-selector-search">
          <Search aria-hidden="true" />
          <Input
            ref={searchRef}
            value={query}
            maxLength={100}
            aria-label={uiText("searchIcon", { label })}
            aria-controls={resultsId}
            placeholder={uiText("searchIcons_c320")}
            onChange={(event) => {
              setQuery(event.target.value);
              setCategory("all");
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "ArrowDown" && availableIcons.length) {
                event.preventDefault();
                const selectedIndex = availableIcons.findIndex((icon) => icon.name === tabStop);
                focusIcon(Math.max(0, selectedIndex));
              } else if (event.key === "Enter") {
                event.preventDefault();
                if (query.trim() && availableIcons[0]) selectIcon(availableIcons[0].name);
              }
            }}
          />
        </div>
        <div className="notebook-icon-selector-categories" role="group" aria-label={uiText("iconCategories_7ee8")}>
          {categories.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              contentStyle="preserve"
              className="notebook-icon-selector-category"
              aria-pressed={category === item.id}
              aria-controls={resultsId}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="notebook-icon-selector-results" id={resultsId}>
          {availableIcons.length ? (
            <div ref={gridRef} className="notebook-icon-selector-grid" role="group" aria-label={uiText("availableIcons_29dd")}>
              {availableIcons.map((icon, index) => {
                const Icon = resolvePageIcon(icon.name)!;
                return (
                  <Button
                    key={icon.name}
                    ref={(element) => { iconRefs.current[index] = element; }}
                    type="button"
                    variant="ghost"
                    contentStyle="preserve"
                    className="notebook-icon-selector-option"
                    title={icon.label}
                    aria-label={icon.label}
                    aria-pressed={savedValue === icon.name}
                    tabIndex={tabStop === icon.name ? 0 : -1}
                    onClick={() => selectIcon(icon.name)}
                    onFocus={() => setFocusedIcon(icon.name)}
                    onKeyDown={(event) => handleIconKeyDown(event, index)}
                  >
                    <Icon aria-hidden="true" />
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="notebook-icon-selector-empty" role="status">{uiText("noMatchingIcons_f8cb")}</div>
          )}
        </div>
        <div className="notebook-icon-selector-actions">
          <Button type="button" variant="ghost" contentStyle="preserve" onClick={handleRandom} aria-label={uiText("randomizeIcon", { label })}>
            <Shuffle aria-hidden="true" />
            {uiText("random_3bde")}</Button>
          <Button
            type="button"
            variant="ghost"
            contentStyle="preserve"
            onClick={() => selectIcon(defaultIcon)}
            disabled={currentValue === defaultIcon}
            aria-label={uiText("resetIcon", { label })}
          >
            <RotateCcw aria-hidden="true" />
            {uiText("resetToDefaults_7468")}</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
