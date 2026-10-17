import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/page/NewTabButton.tsx#localMessages:1">`
zh-Hans:
  newTab: "新标签页"
en:
  newTab: "New tab"
`;
const uiText = createTranslator(localMessages);
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
            aria-label={uiText("newTab")}
          >
            <Plus className="h-4 w-4" />
          </IconButton>
        </TooltipTrigger>
        <TooltipContent side="bottom">{uiText("newTab")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
