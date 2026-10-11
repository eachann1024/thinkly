import * as React from "react";
import { cn } from "@/lib/utils";

/** 列表只共享状态与背景形状；行高、虚拟坐标和内容排版由所属列表保留。 */
export const ListRow = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = "button", ...props }, ref) => (
    <button {...props} ref={ref} type={type} data-goose-control="list-row"
      className={cn("goose-list-row", className)} />
  ),
);
ListRow.displayName = "ListRow";
