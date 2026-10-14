import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { fieldVariants } from "./control-recipes";
import { useFieldControl } from "./field";
export interface TextareaProps extends React.ComponentPropsWithoutRef<"textarea">, VariantProps<typeof fieldVariants> {}
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, context = "shell", variant, controlSize, ...props }, ref) => {
    const association = useFieldControl(props);
    return <textarea ref={ref} {...props} {...association} data-slot="textarea" data-goose-control="textarea" data-goose-context={context}
      data-goose-inline-input={variant === "inline" || undefined}
      className={cn(fieldVariants({ context, variant, controlSize }), "h-auto", variant === "inline" ? "min-h-0" : "min-h-20", className)} />;
  },
);
Textarea.displayName = "Textarea";
export { Textarea };
