import { IconButton } from "@/components/ui/icon-button";
import { Plus } from "@/components/ui/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function NewTabButton({ onClick }: { onClick: () => void }) {
  return (
    <TooltipProvider delayDuration={600}>
      <Tooltip>
        <TooltipTrigger asChild>
          <IconButton
            size="icon"
            tone="muted"
            type="button"
            className="shrink-0 text-muted-foreground"
            onClick={onClick}
            aria-label="新标签页"
          >
            <Plus className="h-4 w-4" />
          </IconButton>
        </TooltipTrigger>
        <TooltipContent side="bottom">新标签页</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
