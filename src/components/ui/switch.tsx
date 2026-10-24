import * as React from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./field";

export type SwitchProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  controlSize?: "default" | "small";
  onCheckedChange?: (checked: boolean) => void;
};
const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, onChange, controlSize = "default", ...props }, ref) => {
    const association = useFieldControl(props);
    return (
    <input
      {...props}
      {...association}
      data-goose-control="switch"
      data-goose-size={controlSize}
      ref={ref}
      type="checkbox"
      role="switch"
      className={cn(
        "peer relative inline-block h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-[var(--goose-control-radius,8px)] border-2 border-input bg-input transition-colors enabled:hover:bg-[var(--goose-interactive-hover)] enabled:hover:border-[var(--goose-interactive-hover-border)] checked:bg-[var(--goose-interactive-selected)] checked:border-[var(--goose-interactive-selected-border)] disabled:cursor-not-allowed disabled:text-disabled before:pointer-events-none before:absolute before:left-0.5 before:top-1/2 before:h-4 before:w-4 before:-translate-y-1/2 before:rounded-thumb before:bg-background before:shadow-lg before:transition-transform checked:before:translate-x-5 checked:before:bg-[var(--goose-interactive-selected-border)] motion-reduce:transition-none motion-reduce:before:transition-none",
        controlSize === "small" && "h-5 w-9 before:h-3 before:w-3 checked:before:translate-x-4",
        className,
      )}
      onChange={(event) => {
        onChange?.(event);
        onCheckedChange?.(event.currentTarget.checked);
      }}
    />
    );
  },
);
Switch.displayName = "Switch";
export { Switch };

export const SwitchRow = React.forwardRef<
  HTMLLabelElement,
  React.ComponentPropsWithoutRef<"label">
>(({ className, ...props }, ref) => (
  <label
    {...props}
    ref={ref}
    className={cn(
      "cursor-pointer has-[:enabled]:hover:bg-[var(--goose-interactive-hover)] has-[:disabled]:cursor-not-allowed",
      className,
    )}
  />
));
SwitchRow.displayName = "SwitchRow";
