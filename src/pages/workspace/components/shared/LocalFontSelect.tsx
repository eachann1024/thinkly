import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/shared/LocalFontSelect.tsx#localMessages:1">`
zh-Hans:
  selected: "{{label}}：{{name}}"
  selectedFallback: "{{label}}：{{name}}，未安装，已回退"
  systemFont: "系统字体"
  fontNotInstalledUsingAFallback: "本机未找到，已使用备用字体"
  checkingInstalledFonts: "正在确认本机字体…"
  fontMissing: "{{name}}（未安装，已回退）"
  couldnTReadInstalledFontsReopenThe: "无法读取本机字体，请重新打开菜单重试。"
  loadingInstalledFonts: "正在读取本机字体…"
  noInstalledFontsFound: "未读取到本机字体。"
en:
  selected: "{{label}}: {{name}}"
  selectedFallback: "{{label}}: {{name}}, not installed; using fallback"
  systemFont: "System font"
  fontNotInstalledUsingAFallback: "Font not installed; using a fallback"
  checkingInstalledFonts: "Checking installed fonts…"
  fontMissing: "{{name}} (not installed; using fallback)"
  couldnTReadInstalledFontsReopenThe: "Couldn’t read installed fonts. Reopen the menu to try again."
  loadingInstalledFonts: "Loading installed fonts…"
  noInstalledFontsFound: "No installed fonts found."
`;
const uiText = createTranslator(localMessages);
import { useEffect, useMemo, useReducer } from "react";
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
} from "@/lib/localFontOptions";

import { localFontLoadReducer, fontProbeReducer } from "./localFontLoadState";
import { useFontSelectionPreview } from "./useFontSelectionPreview";
import { VirtualFontList, type FontListOption } from "./VirtualFontList";

export function LocalFontSelect({
  id,
  label,
  value,
  onChange,
  baseFont = SYSTEM_FONT_STACK,
  baseFontLabel = uiText("systemFont"),
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
  const [fontLoad, dispatchFonts] = useReducer(localFontLoadReducer, { status: "idle" });
  const fonts = fontLoad.status === "idle" ? null : fontLoad.fonts;
  const fontAccessFailed = fontLoad.status === "error";
  const [fontProbe, dispatchProbe] = useReducer(fontProbeReducer, { status: "idle" });
  const savedFont = fontProbe.status === "ready" ? fontProbe : null;
  useEffect(() => {
    if (!open && fonts !== null) return;
    let active = true;
    dispatchFonts({ type: "load" });
    void getAvailableLocalFonts().then((available) => {
      if (active) {
        dispatchFonts({ type: "loaded", fonts: available });
      }
    }).catch(() => {
      if (active) dispatchFonts({ type: "failed" });
    });
    return () => {
      active = false;
    };
  }, [open, fonts]);
  useEffect(() => {
    if (!value || value === baseFont || fonts?.some((font) => font.family === value)) {
      dispatchProbe({ type: "reset" });
      return;
    }
    let active = true;
    dispatchProbe({ type: "probe", family: value });
    void probeLocalFont(value).then((available) => {
      if (active) dispatchProbe({ type: "probed", family: value, available });
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
            aria-label={uiText(fallback ? "selectedFallback" : "selected", {label, name: selectedName})}
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
                    ? uiText("fontNotInstalledUsingAFallback")
                    : uiText("checkingInstalledFonts")}
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
              {fallback ? uiText("fontMissing", {name: value ?? selectedName}) : fontAccessFailed
                ? uiText("couldnTReadInstalledFontsReopenThe")
                : fonts === null ? uiText("loadingInstalledFonts") : uiText("noInstalledFontsFound")}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
