import { useId, useState } from "react";
import * as GooseIcons from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import { type WatermarkConfig } from "@/lib/imageExport";
import { cn } from "@/lib/utils";

export function GenerationOptionsPanel({
  wm,
  onToggle,
}: {
  wm: WatermarkConfig;
  onToggle: (key: keyof WatermarkConfig) => void;
}) {
  const labelPrefix = useId();
  const [open, setOpen] = useState(false);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const rows: Array<{
    key: keyof WatermarkConfig;
    label: string;
    disabled?: boolean;
  }> = [
    { key: "showBrand", label: "品牌", disabled: !wm.showWatermark },
    { key: "showDate", label: "日期", disabled: !wm.showWatermark },
    { key: "showTime", label: "时分秒", disabled: !wm.showWatermark || !wm.showDate },
  ];
  const renderRow = (key: keyof WatermarkConfig, label: string, disabled = false, child = false) => (
    <label
      key={key}
      style={child ? { paddingInlineStart: 24 } : undefined}
      htmlFor={`${labelPrefix}-${key}`}
      className={cn(
        "goose-menu-item flex items-center justify-between cursor-pointer hover:bg-[var(--goose-interactive-hover)]",

        disabled && "cursor-not-allowed text-muted-foreground opacity-50 hover:bg-transparent",
      )}
    >
      <span>{label}</span>
      <Switch
        id={`${labelPrefix}-${key}`}
        controlSize="small"
        checked={wm[key]}
        onCheckedChange={() => onToggle(key)}
        disabled={disabled}
        className="disabled:border-input disabled:bg-input disabled:before:bg-muted-foreground disabled:before:shadow-none disabled:opacity-50"
      />
    </label>
  );

  return (
    <div ref={setContainer} role="group" aria-label="生成选项" className="ml-auto shrink-0">
      {/* Keep the portal host outside the button row so mounting it cannot add a flex gap. */}
      <div className="flex items-center gap-2">
        <Toggle
          variant="outline"
          size="sm"
          pressed={wm.showTitle}
          onPressedChange={() => onToggle("showTitle")}
          className="h-8 gap-1.5 text-xs"
          aria-label="标题"
        >
          <GooseIcons.Type className="h-3.5 w-3.5" />
          标题
        </Toggle>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" aria-label="底部栏选项">
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  wm.showWatermark ? "bg-[var(--goose-accent-solid)]" : "bg-muted-foreground/50",
                )}
              />
              底部栏
              <GooseIcons.ChevronDown className={cn("h-3.5 w-3.5 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            variant="menu"
            container={container}
            align="end"
            side="bottom"
            sideOffset={6}
            collisionPadding={12}
            aria-label="底部栏选项"
            className="goose-list-layout w-60 max-w-[calc(100vw-24px)]"
            onKeyDownCapture={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            }}
          >
            {renderRow("showWatermark", "底部栏")}
            {rows.map((row) => renderRow(row.key, row.label, row.disabled, true))}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
