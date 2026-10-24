import * as React from "react";
import { cn } from "@/lib/utils";

export const ListRow = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = "button", ...props }, ref) => (
    <button {...props} ref={ref} type={type} data-goose-control="list-row"
      className={cn("goose-list-row", className)} />
  ),
);
ListRow.displayName = "ListRow";
