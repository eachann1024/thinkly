import * as React from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
export interface SegmentedOption { value: string; label: React.ReactNode; disabled?: boolean }
interface SegmentedControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: SegmentedOption[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}
/** 表单选择使用radiogroup，不能与文档导航Tabs混用。 */
export function SegmentedControl({ options, value, onValueChange, disabled, className, ...props }: SegmentedControlProps) {
  const enabled = options.filter(option => !disabled && !option.disabled);
  const tabStop = enabled.some(option => option.value === value) ? value : enabled[0]?.value;
  return <div {...props} role="radiogroup" data-goose-control="segmented-control" className={cn("flex gap-2", className)}>
    {options.map(option => <Button key={option.value} type="button" role="radio" aria-checked={value === option.value} className="goose-accent-selection"
      disabled={disabled || option.disabled} tabIndex={tabStop === option.value ? 0 : -1}
      variant={value === option.value ? "secondary" : "ghost"} onClick={() => onValueChange(option.value)}
      onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key) || !enabled.length) return;
        event.preventDefault();
        const index = enabled.findIndex(item => item.value === option.value);
        const next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1 :
          (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + enabled.length) % enabled.length;
        onValueChange(enabled[next].value);
        const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)');
        buttons?.[next]?.focus();
      }}>{option.label}</Button>)}
  </div>;
}
