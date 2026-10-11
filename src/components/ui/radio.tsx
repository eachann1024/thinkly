import * as React from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./field";
export type RadioProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;
export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(({ className, ...props }, ref) => {
  const association = useFieldControl(props);
  return <input ref={ref} {...props} {...association} type="radio" data-goose-control="radio"
    className={cn("goose-radio size-4 shrink-0 accent-[var(--goose-interactive-selected-border)] disabled:cursor-not-allowed", className)} />;
});
Radio.displayName = "Radio";
