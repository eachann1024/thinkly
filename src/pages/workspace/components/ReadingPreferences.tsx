import { useLocale } from "@/i18n";
import { formatDecimal, formatNumber } from "@/i18n/format";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/ReadingPreferences.tsx#localMessages:1">`
zh-Hans:
  textSize: "正文字号"
  lineSpacing: "正文行距"
  times: "倍"
  readingPreview: "阅读效果预览"
  livePreview: "实时预览"
  giveYourWordsRoomToBreathe: "留一点呼吸，给文字"
  writeDownSomethingWorthRememberingTodayThere: "把今天值得记住的事，写在这里。不必急着整理思绪，先为一个灵感留下一点空间。"
  aLittleSpaceBetweenTheLinesMakes: "让行与行之间留一点呼吸，长篇笔记也能从容读完。"
  lineSpacingPresets: "行距预设"
  standard: "标准"
  relaxed: "宽松"
en:
  textSize: "Text size"
  lineSpacing: "Line spacing"
  times: "×"
  readingPreview: "Reading preview"
  livePreview: "Live preview"
  giveYourWordsRoomToBreathe: "Give your words room to breathe"
  writeDownSomethingWorthRememberingTodayThere: "Write down something worth remembering today. There’s no need to organize your thoughts yet—just make room for an idea."
  aLittleSpaceBetweenTheLinesMakes: "A little space between the lines makes even long notes comfortable to read."
  lineSpacingPresets: "Line spacing presets"
  standard: "Standard"
  relaxed: "Relaxed"
`;
const uiText = createTranslator(localMessages);
import { useId } from "react";
import { Range } from "@/components/ui/range";
import { Button } from "@/components/ui/button";
import {
  EDITOR_FONT_SIZE_MIN,
  EDITOR_FONT_SIZE_MAX,
  EDITOR_LINE_HEIGHT_MIN,
  EDITOR_LINE_HEIGHT_MAX,
  EDITOR_LINE_HEIGHT_DEFAULT,
} from "@/stores/settings/types";

export function ReadingPreferences({ showPreview = true, fontSize, lineHeight, onFontSizeChange, onLineHeightChange }: {
  showPreview?: boolean;
  fontSize: number;
  lineHeight: number;
  onFontSizeChange: (value: number) => void;
  onLineHeightChange: (value: number) => void;
}) {
  useLocale();
  const id = useId();
  const fields = [
    { key: "size", label: uiText("textSize"), value: fontSize, min: EDITOR_FONT_SIZE_MIN, max: EDITOR_FONT_SIZE_MAX, step: 1, unit: "px", change: onFontSizeChange },
    { key: "height", label: uiText("lineSpacing"), value: lineHeight, min: EDITOR_LINE_HEIGHT_MIN, max: EDITOR_LINE_HEIGHT_MAX, step: 0.05, unit: uiText("times"), change: onLineHeightChange },
  ];
  return <div className="space-y-5">
    {showPreview && <section aria-label={uiText("readingPreview")} className="border-b border-border px-2 pb-5">
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{uiText("livePreview")}</span><span className="tabular-nums">{formatNumber(fontSize)} px / {formatDecimal(lineHeight, 2)}</span>
      </div>
      <h3 className="mb-3 text-lg font-semibold tracking-tight">{uiText("giveYourWordsRoomToBreathe")}</h3>
      <div className="space-y-3 text-foreground" style={{ fontSize, lineHeight }}>
        <p>{uiText("writeDownSomethingWorthRememberingTodayThere")}</p>
        <p>{uiText("aLittleSpaceBetweenTheLinesMakes")}</p>
      </div>
    </section>}
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {fields.map(field => <div key={field.key}>
        <div className="flex items-center justify-between gap-3 text-sm">
          <label htmlFor={`${id}-${field.key}`}>{field.label}</label>
          <output htmlFor={`${id}-${field.key}`} className="font-medium tabular-nums">{field.step < 1 ? formatDecimal(field.value, 2) : formatNumber(field.value)} {field.unit}</output>
        </div>
        <Range id={`${id}-${field.key}`} min={field.min} max={field.max} step={field.step} value={field.value}
          aria-valuetext={`${formatNumber(field.value)} ${field.unit}`}
          onChange={event => field.change(event.currentTarget.valueAsNumber)} />
        <div className="flex justify-between text-xs text-muted-foreground"><span>{formatNumber(field.min)} {field.unit}</span><span>{formatNumber(field.max)} {field.unit}</span></div>
      </div>)}
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label={uiText("lineSpacingPresets")}>
      {([[1.5, uiText("standard")], [EDITOR_LINE_HEIGHT_DEFAULT, uiText("relaxed")]] as const).map(([value, label]) =>
        <Button key={value} type="button" variant="outline" size="sm" aria-pressed={lineHeight === value}
          className="goose-accent-selection border-border text-xs"
          onClick={() => onLineHeightChange(value)}>{label} {formatDecimal(value, 2)}</Button>)}
    </div>
  </div>;
}
