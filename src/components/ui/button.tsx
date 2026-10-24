import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./control-recipes";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  busy?: boolean;
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, contentStyle = "default", context = "shell", busy, ...props }, ref) => (
    <button ref={ref} data-slot="button" data-goose-control="button" data-goose-context={context} data-goose-content-style={contentStyle}
      aria-busy={busy || undefined} data-busy={busy || undefined}
      className={cn(buttonVariants({ variant, size, context, contentStyle, className }))} {...props} />
  ),
);
Button.displayName = "Button";
export { Button, buttonVariants };
