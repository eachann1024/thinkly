import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const selectableCardVariants = cva(
  "goose-interactive goose-accent-selection w-full rounded-[var(--goose-selectable-card-radius,var(--radius,0.75rem))] border text-left transition-colors duration-[var(--goose-control-motion-duration,150ms)] motion-reduce:transition-none ring-offset-background disabled:pointer-events-none disabled:text-disabled",
  {
    variants: {
      selected: {
        true: "goose-interactive--selected border-transparent",
        false: "border-transparent",
      },
      tone: {
        default: "",
        danger: "goose-interactive-danger",
      },
    },
    defaultVariants: {
      selected: false,
      tone: "default",
    },
  },
);

export interface SelectableCardProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof selectableCardVariants> {}

const SelectableCard = React.forwardRef<HTMLButtonElement, SelectableCardProps>(
  ({ className, selected, tone, ...props }, ref) => {
    return (
      <button
        ref={ref}
        data-goose-control="selectable-card"
        data-selected={selected || undefined}
        aria-pressed={selected ?? false}
        className={cn(selectableCardVariants({ selected, tone, className }))}
        {...props}
      />
    );
  },
);

SelectableCard.displayName = "SelectableCard";

export { SelectableCard };
