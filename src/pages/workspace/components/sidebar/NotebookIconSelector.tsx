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
}

const categories: ReadonlyArray<{ id: NotebookIconFilter; label: string }> = [
  { id: "all", label: "全部" },
  ...NOTEBOOK_ICON_CATEGORIES,
];

export function NotebookIconSelector({
  value,
  defaultIcon,
  onChange,
  container,
}: NotebookIconSelectorProps) {
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
    [query, category],
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
          aria-label="选择笔记本图标"
          title={currentValue}
        >
          <span
            aria-hidden="true"
            className={`notebook-icon-selector-preview ${CurrentIcon ? "" : textPreviewClass}`}
          >
            {CurrentIcon ? createElement(CurrentIcon) : currentValue}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="notebook-icon-selector"
        aria-label="选择笔记本图标"
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
            aria-label="搜索笔记本图标"
            aria-controls={resultsId}
            placeholder="搜索图标"
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
        <div className="notebook-icon-selector-categories" role="group" aria-label="图标分类">
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
            <div ref={gridRef} className="notebook-icon-selector-grid" role="group" aria-label="可选图标">
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
            <div className="notebook-icon-selector-empty" role="status">没有匹配的图标</div>
          )}
        </div>
        <div className="notebook-icon-selector-actions">
          <Button type="button" variant="ghost" contentStyle="preserve" onClick={handleRandom} aria-label="随机选择笔记本图标">
            <Shuffle aria-hidden="true" />
            随机
          </Button>
          <Button
            type="button"
            variant="ghost"
            contentStyle="preserve"
            onClick={() => selectIcon(defaultIcon)}
            disabled={currentValue === defaultIcon}
            aria-label="恢复笔记本默认图标"
          >
            <RotateCcw aria-hidden="true" />
            恢复默认
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
