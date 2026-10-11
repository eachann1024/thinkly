import * as React from "react";
import { cn } from "@/lib/utils";

/** 保留浏览器原生展开、键盘及 toggle 事件，不创建另一份展开状态。 */
export const Disclosure = React.forwardRef<HTMLDetailsElement, React.DetailsHTMLAttributes<HTMLDetailsElement>>(
  (props, ref) => <details {...props} ref={ref} data-goose-control="disclosure" />,
);
Disclosure.displayName = "Disclosure";
export const DisclosureSummary = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => <summary {...props} ref={ref} data-goose-control="disclosure-summary"
    className={cn("goose-interactive", className)} />,
);
DisclosureSummary.displayName = "DisclosureSummary";
