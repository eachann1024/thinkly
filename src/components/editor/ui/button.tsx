import * as React from "react";
import { Button as SharedButton, buttonVariants, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ context = "editor", ...props }, ref) => <SharedButton ref={ref} context={context} {...props} />,
);
Button.displayName = "EditorButton";

const EditorAction = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, context = "editor", variant = "ghost", contentStyle = "preserve", ...props }, ref) => (
    <SharedButton ref={ref} context={context} variant={variant} contentStyle={contentStyle}
      className={cn("goose-editor-action h-auto w-auto min-w-0 border-0 p-0 text-inherit", className)} {...props} />
  ),
);
EditorAction.displayName = "EditorAction";
export { Button, EditorAction, buttonVariants };
export type { ButtonProps };
