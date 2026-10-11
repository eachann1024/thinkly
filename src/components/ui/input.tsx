import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { fieldVariants } from "./control-recipes";
import { useFieldControl } from "./field";
export interface InputProps extends React.ComponentPropsWithoutRef<"input">, VariantProps<typeof fieldVariants> {}
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, context = "shell", variant, controlSize, ...props }, ref) => {
    const association = useFieldControl(props);
    return <input ref={ref} {...props} {...association} data-slot="input" data-goose-control="input" data-goose-context={context}
      data-goose-inline-input={variant === "inline" || undefined}
      className={cn(fieldVariants({ context, variant, controlSize }), "flex file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground", className)} />;
  },
);
Input.displayName = "Input";
export { Input };
