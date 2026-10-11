import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { fieldVariants } from "./control-recipes";
import { useFieldControl } from "./field";
export interface SelectProps extends React.ComponentPropsWithoutRef<"select">, VariantProps<typeof fieldVariants> {}
export type NativeSelectProps = SelectProps;
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, context = "shell", variant, controlSize, ...props }, ref) => {
    const association = useFieldControl(props);
    return <select ref={ref} {...props} {...association} data-slot="select" data-goose-control="select" data-goose-context={context}
      data-goose-inline-input={variant === "inline" || undefined}
      className={cn(fieldVariants({ context, variant, controlSize }),  className)} />;
  },
);
Select.displayName = "Select";
export { Select, Select as NativeSelect };
