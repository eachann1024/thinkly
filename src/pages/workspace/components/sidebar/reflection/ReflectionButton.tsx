import { useLocale } from "@/i18n";
import { useState } from "react";
import { createTranslator, i18nYaml } from "@/i18n";
import { IconButton } from "@/components/ui/icon-button";
import { SidebarRailIcon } from "../SidebarRailIcon";
import { previousWeek } from "@/lib/reflection/weekRange";
import { selectHasUnseenReflection, useReflection } from "@/stores/useReflection";
import { ReflectionDialog } from "./ReflectionDialog";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionButton.tsx#localMessages:1">`
zh-Hans:
  reflection: "反思"
en:
  reflection: "Reflection"
`;
const uiText = createTranslator(localMessages);

export function ReflectionButton({ className }: { className?: string }) {
  useLocale();
  const [open, setOpen] = useState(false);
  const unseen = useReflection(selectHasUnseenReflection(previousWeek().key));
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <IconButton
            type="button"
            size="xs"
            active={open}
            className={className}
            aria-label={uiText("reflection")}
            title={uiText("reflection")}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <span className="relative inline-flex shrink-0">
              <SidebarRailIcon name="calendar" selected={open} />
              {unseen && (
                <span aria-hidden="true" className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-danger ring-2 ring-background" />
              )}
            </span>
          </IconButton>
        </TooltipTrigger>
        <TooltipContent side="right">{uiText("reflection")}</TooltipContent>
      </Tooltip>
      <ReflectionDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
