import * as React from "react";
import { Button as SharedButton, buttonVariants, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The editor keeps its import boundary; visuals and states belong to the shared control.
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ context = "editor", ...props }, ref) => <SharedButton ref={ref} context={context} {...props} />,
);
Button.displayName = "EditorButton";

// Geometry remains owned by block/toolbar layouts (including measured table handles).
// This adapter adds shared states without introducing a new hit-box or gesture handler.
const EditorAction = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, context = "editor", variant = "ghost", contentStyle = "preserve", ...props }, ref) => (
    <SharedButton ref={ref} context={context} variant={variant} contentStyle={contentStyle}
      className={cn("goose-editor-action h-auto w-auto min-w-0 border-0 p-0 text-inherit", className)} {...props} />
  ),
);
EditorAction.displayName = "EditorAction";
export { Button, EditorAction, buttonVariants };
export type { ButtonProps };
