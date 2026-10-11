import * as React from "react";
import { Input as SharedInput, type InputProps } from "@/components/ui/input";
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ context = "editor", ...props }, ref) => <SharedInput ref={ref} context={context} {...props} />,
);
Input.displayName = "EditorInput";
export { Input };
export type { InputProps };
