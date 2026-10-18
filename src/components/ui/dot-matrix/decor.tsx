import { cn } from "@/lib/utils";
import "./dot-matrix.css";
import { CORE_DECOR_PRESETS } from "./decorPresetCore";
import { WELCOME_DECOR_PRESETS } from "./decorPresetWelcome";
import { WORKFLOW_DECOR_PRESETS } from "./decorPresetWorkflow";
import type { DecorItem, DotDecorPreset } from "./decorTypes";

export type { DotDecorPreset } from "./decorTypes";

const PRESETS: Record<DotDecorPreset, DecorItem[]> = {
  ...CORE_DECOR_PRESETS,
  ...WORKFLOW_DECOR_PRESETS,
  ...WELCOME_DECOR_PRESETS,
} as Record<DotDecorPreset, DecorItem[]>;

const AT = {
  "top-left": "tl",
  "top-right": "tr",
  "bottom-left": "bl",
  "bottom-right": "br",
} as const;

/** 缺省图边角装饰层；compact 用于设置卡片等较矮的容器。 */
export function DotDecor({
  preset,
  compact = false,
  className,
}: {
  preset: DotDecorPreset;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("goose-dm-decor", className)}
      data-decor={compact ? "compact" : "area"}
      aria-hidden
    >
      {PRESETS[preset].map((item, i) => (
        <div
          key={i}
          className="goose-dm-decor-item"
          data-at={AT[item.at]}
          data-minor={item.minor ? "" : undefined}
        >
          {item.node}
        </div>
      ))}
    </div>
  );
}
