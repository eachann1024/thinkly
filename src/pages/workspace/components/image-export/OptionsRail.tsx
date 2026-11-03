import { useLocale, createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/image-export/OptionsRail.tsx#localMessages:1">`
zh-Hans:
  options: "生成选项"
  imageWidth: "图片宽度"
  phone: "手机 720"
  standard: "标准 1080"
  wide: "宽屏 1440"
  content: "内容"
  title: "标题"
  noteTitle: "笔记标题"
  footer: "底部栏"
  brand: "品牌"
  date: "日期"
  time: "时分秒"
  brandText: "品牌文字"
  brandPlaceholder: "留空则不显示品牌"
  brandHint: "会记住，下次直接沿用"
  kenyaNote: "原研哉主题本身不带底部栏，换主题后恢复。"
  exportSelection: "改为导出选中内容"
en:
  options: "Export options"
  imageWidth: "Image width"
  phone: "Phone 720"
  standard: "Standard 1080"
  wide: "Wide 1440"
  content: "Content"
  title: "Title"
  noteTitle: "Note title"
  footer: "Footer"
  brand: "Brand"
  date: "Date"
  time: "Time"
  brandText: "Brand text"
  brandPlaceholder: "Leave empty to hide the brand"
  brandHint: "Remembered for next time"
  kenyaNote: "Kenya Hara has no footer. It comes back when you change themes."
  exportSelection: "Export the selection instead"
ja:
  options: "生成オプション"
  imageWidth: "画像の幅"
  phone: "スマホ 720"
  standard: "標準 1080"
  wide: "ワイド 1440"
  content: "内容"
  title: "タイトル"
  noteTitle: "ノートのタイトル"
  footer: "フッター"
  brand: "ブランド"
  date: "日付"
  time: "時刻"
  brandText: "ブランド文字"
  brandPlaceholder: "空にするとブランドを表示しません"
  brandHint: "次回もそのまま使います"
  kenyaNote: "原研哉テーマにはフッターがありません。テーマを変えると戻ります。"
  exportSelection: "選択範囲の書き出しに変える"
`;
const uiText = createTranslator(localMessages);
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { IMAGE_EXPORT_WIDTHS } from "@/lib/imageExport";
import { resolveCardTheme } from "@/lib/imageExport";
import type { NotebookCardThemeContext } from "@/lib/imageExport";
import type { WatermarkConfig } from "@/lib/imageExport";
import { cn } from "@/lib/utils";
import {
  sessionActiveTheme,
  sessionBlocks,
  useImageExportSession,
} from "@/windows/views/image-export/imageExportSession";
import { describeExportClarity, type ClarityTone } from "./clarityCopy";
import { SegmentedTrack } from "./SegmentedTrack";

const TONE: Record<ClarityTone, string> = {
  normal: "text-[var(--goose-text-secondary)]",
  warning: "text-[var(--goose-text-warning)]",
  danger: "text-[var(--goose-color-danger)]",
};

function patchWatermark(partial: Partial<WatermarkConfig>) {
  useImageExportSession.getState().setWatermark(partial);
}

export function OptionsRail({ themeContext }: { themeContext: NotebookCardThemeContext }) {
  useLocale();
  const watermark = useImageExportSession((s) => s.watermark);
  const scope = useImageExportSession((s) => s.scope);
  const selectionTheme = useImageExportSession((s) => s.selectionTheme);
  const pageTheme = useImageExportSession((s) => s.themeId);
  const width = useImageExportSession((s) => s.width);
  const ratio = useImageExportSession((s) => s.ratio);
  const height = useImageExportSession((s) => s.height);
  const blocks = useImageExportSession(sessionBlocks);
  const themeId = sessionActiveTheme({ scope, selectionTheme, themeId: pageTheme });
  const theme = resolveCardTheme(themeId, themeContext);
  const kenya = !theme.watermarkVisible;
  const empty = scope === "selection" && blocks.length === 0;
  const clarity = describeExportClarity({ empty, width, height, ratio, scope });
  const footerOff = kenya || !watermark.showWatermark;
  const brandOn = watermark.showBrand && !footerOff;

  return (
    <aside
      aria-label={uiText("options")}
      className="flex w-[264px] shrink-0 flex-col gap-[18px] overflow-y-auto border-y border-r border-border bg-[var(--goose-menu-surface)] px-4 py-3"
    >
      <section className="flex flex-col gap-2">
        <div className="text-xs text-[var(--goose-text-secondary)]">{uiText("imageWidth")}</div>
        <SegmentedTrack
          label={uiText("imageWidth")}
          value={width}
          options={IMAGE_EXPORT_WIDTHS.map((value) => ({
            value,
            label: value === 720 ? uiText("phone") : value === 1440 ? uiText("wide") : uiText("standard"),
          }))}
          onChange={(next) => useImageExportSession.getState().setWidth(next)}
        />
        <div className="flex flex-col gap-1 rounded-md border border-border bg-[var(--goose-sidebar-surface)] p-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-medium tabular-nums">{clarity.dims}</span>
            <span className={cn("text-xs tabular-nums", TONE[clarity.tone])}>{clarity.ratioLabel}</span>
          </div>
          <p className={cn("text-xs leading-[18px]", TONE[clarity.tone])}>{clarity.note}</p>
          {clarity.suggestSelection ? (
            <button
              type="button"
              className="self-start text-xs text-foreground"
              onClick={() => useImageExportSession.getState().setScope("selection")}
            >
              {uiText("exportSelection")}
            </button>
          ) : null}
        </div>
      </section>
      <section className="flex flex-col">
        <div className="mb-1 text-xs text-[var(--goose-text-secondary)]">{uiText("content")}</div>
        <OptionRow
          label={scope === "selection" ? uiText("noteTitle") : uiText("title")}
          checked={watermark.showTitle}
          onToggle={() => patchWatermark({ showTitle: !watermark.showTitle })}
        />
        <OptionRow
          label={uiText("footer")}
          checked={watermark.showWatermark && !kenya}
          disabled={kenya}
          onToggle={() => patchWatermark({ showWatermark: !watermark.showWatermark })}
        />
        <OptionRow
          label={uiText("brand")}
          indent
          checked={watermark.showBrand && !footerOff}
          disabled={footerOff}
          onToggle={() => patchWatermark({ showBrand: !watermark.showBrand })}
        />
        {brandOn ? (
          <div className="flex flex-col gap-1 pb-2 pl-3.5">
            <Input
              controlSize="small"
              aria-label={uiText("brandText")}
              maxLength={24}
              placeholder={uiText("brandPlaceholder")}
              value={watermark.brandText}
              onChange={(event) => patchWatermark({ brandText: event.target.value })}
            />
            <span className="text-[11px] text-[var(--goose-text-secondary)]">{uiText("brandHint")}</span>
          </div>
        ) : null}
        <OptionRow
          label={uiText("date")}
          indent
          checked={watermark.showDate && !footerOff}
          disabled={footerOff}
          onToggle={() => patchWatermark({ showDate: !watermark.showDate })}
        />
        <OptionRow
          label={uiText("time")}
          indent
          checked={watermark.showTime && !footerOff && watermark.showDate}
          disabled={footerOff || !watermark.showDate}
          onToggle={() => patchWatermark({ showTime: !watermark.showTime })}
        />
        {kenya ? (
          <p className="mt-1.5 text-xs leading-[18px] text-[var(--goose-text-secondary)]">
            {uiText("kenyaNote")}
          </p>
        ) : null}
      </section>
    </aside>
  );
}

function OptionRow({
  label,
  checked,
  disabled,
  indent,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  indent?: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-9 items-center justify-between gap-3 text-[13px]",
        indent && "pl-3.5",
        disabled && "text-muted-foreground",
      )}
    >
      <span>{label}</span>
      <Switch
        controlSize="small"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onCheckedChange={() => onToggle()}
      />
    </label>
  );
}
