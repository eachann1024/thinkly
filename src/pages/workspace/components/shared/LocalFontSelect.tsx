import { useEffect, useState } from "react";
import { ChevronDown } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SYSTEM_FONT_STACK, toCssFontFamily } from "@/lib/fontLoader";
import {
  getAvailableLocalFonts,
  probeLocalFont,
  type LocalFontOption,
} from "@/lib/localFontOptions";

import { useFontSelectionPreview } from "./useFontSelectionPreview";

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
  const { open, onOpenChange, contentRef, confirmFont } =
    useFontSelectionPreview(value, onChange);
  const [fonts, setFonts] = useState<LocalFontOption[] | null>(null);
  const [fontAccessFailed, setFontAccessFailed] = useState(false);
  const [savedFont, setSavedFont] = useState<{
    family: string;
    available: boolean;
  } | null>(null);
  useEffect(() => {
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
  }, [open]);
  useEffect(() => {
    if (!value || value === baseFont) return;
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
  const options = (fonts ?? []).filter((option) => option.family !== baseFont);
  if (value && value !== baseFont && availability === true && !selectedOption)
    options.push({ family: value, label: value });

  return (
    <div className="min-w-0">
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={`${label}：${selectedName}${fallback ? "，未安装，已回退" : ""}`}
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
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          aria-label={label}
          ref={contentRef}
          className="max-h-80 min-w-[var(--trigger-width)] overflow-y-auto"
        >
          <DropdownMenuRadioGroup value={value ?? baseFont}>
            <DropdownMenuRadioItem
              value={baseFont}
              data-font-preview=""
              onSelect={() => confirmFont(null)}
              style={{ fontFamily: fallbackFontFamily }}
            >
              {baseFontLabel}
            </DropdownMenuRadioItem>
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.family}
                value={option.family}
                data-font-preview={option.family}
                onSelect={() => confirmFont(option.family)}
                style={{
                  fontFamily: `${toCssFontFamily(option.family)}, ${fallbackFontFamily}`,
                }}
              >
                {option.family}
              </DropdownMenuRadioItem>
            ))}
            {fallback && (
              <DropdownMenuRadioItem value={value!} disabled>
                {value}（未安装，已回退）
              </DropdownMenuRadioItem>
            )}
            {fontAccessFailed ? (
              <DropdownMenuRadioItem value="__unavailable__" disabled>
                无法读取本机字体，请重新打开菜单重试。
              </DropdownMenuRadioItem>
            ) : fonts === null && (
              <DropdownMenuRadioItem value="__loading__" disabled>
                正在读取本机字体…
              </DropdownMenuRadioItem>
            )}
            {fonts?.length === 0 && (
              <DropdownMenuRadioItem value="__empty__" disabled>
                未读取到本机字体。
              </DropdownMenuRadioItem>
            )}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
