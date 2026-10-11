import * as React from "react";
import { Checkbox as HeroCheckbox } from "@heroui/react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./field";
export type CheckboxProps = React.ComponentProps<typeof HeroCheckbox>;
function CheckboxRoot({ className, ...props }: CheckboxProps) {
  const association = useFieldControl(props);
  return <HeroCheckbox {...props} {...association} data-goose-control="checkbox"
    className={(state) => cn("goose-checkbox", typeof className === "function" ? className(state) : className)} />;
}
function CheckboxControl({ className, ...props }: React.ComponentProps<typeof HeroCheckbox.Control>) {
  return <HeroCheckbox.Control {...props} data-goose-slot="check-control" className={cn("goose-check-control", className)} />;
}
function CheckboxIndicator(props: React.ComponentProps<typeof HeroCheckbox.Indicator>) {
  return <HeroCheckbox.Indicator {...props} data-goose-slot="check-indicator" />;
}
function CheckboxContent(props: React.ComponentProps<typeof HeroCheckbox.Content>) {
  return <HeroCheckbox.Content {...props} data-goose-slot="check-content" />;
}
const Checkbox = Object.assign(CheckboxRoot, {
  Root: CheckboxRoot, Control: CheckboxControl, Indicator: CheckboxIndicator, Content: CheckboxContent,
});
export { Checkbox, CheckboxRoot, CheckboxControl, CheckboxIndicator, CheckboxContent };
