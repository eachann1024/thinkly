import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SidebarRailItem } from "@/stores/settings/slices/sidebarRailSlice";
import { SidebarRailIcon, type SidebarRailIconName } from "../SidebarRailIcon";
import { useSidebarRailSortable } from "./SidebarRailSortable";

type SidebarRailButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "id" | "children" | "style" | "onPointerDown"
> & {
  id: SidebarRailItem;
  label: string;
  tooltip: ReactNode;
  icon: SidebarRailIconName;
  selected: boolean;
};

export function SidebarRailButton({
  id,
  label,
  tooltip,
  icon,
  selected,
  ...buttonProps
}: SidebarRailButtonProps) {
  const sortable = useSidebarRailSortable(id);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button contentStyle="preserve" variant="ghost" size="sm"
          type="button"
          className="h-auto whitespace-normal border-0 px-0 py-0 sidebar-mode-rail-button rounded-lg"
          aria-label={label}
          aria-pressed={selected}
          {...buttonProps}
          ref={sortable.setNodeRef}
          style={sortable.style}
          data-rail-dragging={sortable.isDragging || undefined}
          onPointerDown={sortable.onPointerDown}
        >
          <SidebarRailIcon name={icon} selected={selected} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
