import * as React from "react";
import { ToggleButton } from "@heroui/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { controlFrame, buttonContent, toggleSizes, type ControlContext } from "./control-recipes";

const toggleVariants = cva(
  `${controlFrame} ${buttonContent} rounded-[var(--goose-toggle-radius,var(--radius-md))] goose-interactive goose-accent-selection`,
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-input bg-transparent hover:bg-[var(--goose-interactive-hover)] hover:text-[var(--goose-interactive-hover-fg)]",
      },
      size: toggleSizes,
      context: { shell: "", editor: "goose-control-editor", media: "goose-control-media" },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Toggle = React.forwardRef<
  HTMLButtonElement,
  Omit<
    React.ComponentPropsWithoutRef<typeof ToggleButton>,
    "className" | "variant" | "size"
  > & {
    className?: string;
    context?: ControlContext;
    pressed?: boolean;
    defaultPressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
    disabled?: boolean;
    busy?: boolean;
  } & VariantProps<typeof toggleVariants>
>(
  (
    {
      className,
      context = "shell",
      variant,
      size,
      pressed,
      defaultPressed,
      onPressedChange,
      disabled,
      busy,
      ...props
    },
    ref,
  ) => (
    <ToggleButton
      ref={ref}
      data-goose-control="toggle"
      data-goose-context={context}
      aria-busy={busy || undefined}
      data-busy={busy || undefined}
      isSelected={pressed}
      defaultSelected={defaultPressed}
      onChange={onPressedChange}
      isDisabled={disabled}
      className={cn(toggleVariants({ variant, size, context, className }))}
      {...props}
    />
  ),
);

Toggle.displayName = "Toggle";

export { Toggle, toggleVariants };
