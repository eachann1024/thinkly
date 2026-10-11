import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { controlFrame, type ControlContext } from "./control-recipes";

const iconButtonVariants = cva(
  `${controlFrame} goose-interactive shrink-0 rounded-[var(--goose-icon-button-radius,6px)] border border-transparent`,
  {
    variants: {
      tone: {
        default:
          "text-foreground",
        muted:
          "text-muted-foreground",
        danger:
          "goose-interactive-danger",
        handle:
          "bg-muted/80 text-muted-foreground border-border/50 backdrop-blur-[1px] cursor-grab",
      },
      size: {
        xs: "h-[var(--goose-icon-button-height-small,24px)] w-[var(--goose-icon-button-height-small,24px)]",
        sm: "h-[var(--goose-icon-button-height-compact,28px)] w-[var(--goose-icon-button-height-compact,28px)]",
        icon: "h-[var(--goose-icon-button-height,32px)] w-[var(--goose-icon-button-height,32px)]",
      },
      active: {
        true: "goose-interactive--selected",
        false: "",
      },
    },
    defaultVariants: {
      tone: "default",
      size: "sm",
      active: false,
    },
  },
);

export interface IconButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  context?: ControlContext;
  busy?: boolean;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, tone, size, active, context = "shell", busy, ...props }, ref) => {
    return (
      <button
        ref={ref}
        data-goose-control="icon-button"
        data-goose-context={context}
        aria-pressed={typeof active === "boolean" ? active : undefined}
        aria-busy={busy || undefined}
        data-busy={busy || undefined}
        className={cn(iconButtonVariants({ tone, size, active, className }))}
        {...props}
      />
    );
  },
);

IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };
