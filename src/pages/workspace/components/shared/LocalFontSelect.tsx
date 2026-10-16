import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SYSTEM_FONT_STACK, toCssFontFamily } from "@/lib/fontLoader";
import {
  getAvailableLocalFonts,
  probeLocalFont,
  type LocalFontOption,
} from "@/lib/localFontOptions";

import { useFontSelectionPreview } from "./useFontSelectionPreview";
import { VirtualFontList, type FontListOption } from "./VirtualFontList";

export function LocalFontSelect({
  id,
  label,
  value,
  onChange,
  baseFont = SYSTEM_FONT_STACK,
  baseFontLabel = "系统字体",
  fallbackFontFamily = SYSTEM_FONT_STACK,
}: {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  baseFont?: string;
  baseFontLabel?: string;
  fallbackFontFamily?: string;
}) {
  const { open, onOpenChange, contentRef, confirmFont, previewFont } =
    useFontSelectionPreview(value, onChange);
  const [fonts, setFonts] = useState<LocalFontOption[] | null>(null);
  const [fontAccessFailed, setFontAccessFailed] = useState(false);
  const [savedFont, setSavedFont] = useState<{
    family: string;
    available: boolean;
  } | null>(null);
  useEffect(() => {
    if (!open && fonts !== null) return;
    let active = true;
    void getAvailableLocalFonts().then((available) => {
      if (active) {
        setFonts(available);
        setFontAccessFailed(false);
      }
    }).catch(() => {
      if (active) setFontAccessFailed(true);
    });
    return () => {
      active = false;
    };
  }, [open, fonts]);
  useEffect(() => {
    if (!value || value === baseFont || fonts?.some((font) => font.family === value)) return;
    let active = true;
    void probeLocalFont(value).then((available) => {
      if (active) setSavedFont({ family: value, available });
    });
    return () => {
      active = false;
    };
  }, [value, baseFont, fonts]);
  const selectedOption = (fonts ?? []).find(
    (option) => option.family === value,
  );
  const availability = selectedOption || value === baseFont
    ? true
    : savedFont?.family === value
      ? savedFont.available
      : undefined;
  const selectedName = !value || value === baseFont ? baseFontLabel : value;
  const fallback = Boolean(value && availability === false);
  const selectedFamily =
    !value || fallback || availability === undefined
      ? fallbackFontFamily
      : `${toCssFontFamily(value)}, ${fallbackFontFamily}`;
  const listedOptions = useMemo<FontListOption[]>(() => [
    { family: null, label: baseFontLabel },
    ...(fonts ?? []).filter((option) => option.family !== baseFont),
  ], [fonts, baseFont, baseFontLabel]);
  const options = value && value !== baseFont && availability === true && !selectedOption
    ? [...listedOptions, { family: value, label: value }]
    : listedOptions;

  return (
    <div className="min-w-0">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={`${label}：${selectedName}${fallback ? "，未安装，已回退" : ""}`}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                onOpenChange(true);
              }
            }}
            className="h-auto min-h-11 w-full min-w-0 justify-between gap-3 border-input px-3 py-2 font-normal text-foreground"
          >
            <span
              className="min-w-0 text-left"
              style={{ fontFamily: selectedFamily }}
            >
              <span className="block truncate">{selectedName}</span>
              {(fallback || (value && availability === undefined)) && (
                <span className="block text-xs text-muted-foreground">
                  {fallback
                    ? "本机未找到，已使用备用字体"
                    : "正在确认本机字体…"}
                </span>
              )}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="shrink-0 text-muted-foreground"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          variant="menu"
          align="start"
          aria-label={label}
          ref={contentRef}
          className="min-w-[var(--goose-popover-trigger-width)] p-1.5 text-popover-foreground"
        >
          <VirtualFontList
            label={label}
            options={options}
            value={value === baseFont ? null : value}
            fallbackFontFamily={fallbackFontFamily}
            onPreview={previewFont}
            onConfirm={confirmFont}
          />
          {(fallback || fontAccessFailed || fonts === null || fonts.length === 0) && (
            <p role="status" className="px-2 py-1.5 text-xs text-muted-foreground">
              {fallback ? `${value}（未安装，已回退）` : fontAccessFailed
                ? "无法读取本机字体，请重新打开菜单重试。"
                : fonts === null ? "正在读取本机字体…" : "未读取到本机字体。"}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
