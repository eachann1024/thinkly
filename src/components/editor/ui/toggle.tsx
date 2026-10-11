import * as React from "react";
import { Toggle as SharedToggle, toggleVariants } from "@/components/ui/toggle";
const Toggle = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof SharedToggle>>(
  ({ context = "editor", ...props }, ref) => <SharedToggle ref={ref} context={context} {...props} />,
);
Toggle.displayName = "EditorToggle";
export { Toggle, toggleVariants };
