import * as React from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./field";

export type RangeProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

function rangeNumber(value: unknown, fallback: number): number {
  if (value == null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export const Range = React.forwardRef<HTMLInputElement, RangeProps>(
  ({ className, min, max, value, defaultValue, style, onChange, ...props }, ref) => {
    const association = useFieldControl(props);
    const lower = rangeNumber(min, 0);
    const upper = rangeNumber(max, 100);
    const midpoint = upper < lower ? lower : lower + (upper - lower) / 2;
    const [localValue, setLocalValue] = React.useState(() => rangeNumber(defaultValue, midpoint));
    const currentValue = value === undefined ? localValue : rangeNumber(value, midpoint);
    const fill = upper <= lower ? 0 : Math.max(0, Math.min(100, (currentValue - lower) / (upper - lower) * 100));
    const fillStyle = { "--range-fill": `${fill}%`, ...style } as React.CSSProperties;

    return <input ref={ref} {...props} {...association} type="range" data-goose-control="range"
      min={min} max={max} value={value} defaultValue={defaultValue} style={fillStyle}
      className={cn("goose-range w-full disabled:cursor-not-allowed", className)}
      onChange={(event) => {
        onChange?.(event);
        if (value === undefined) setLocalValue(event.currentTarget.valueAsNumber);
      }} />;
  },
);
Range.displayName = "Range";
