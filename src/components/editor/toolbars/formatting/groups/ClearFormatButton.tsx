import * as GooseIcons from "@/components/ui/icons";
import { Tooltip, TooltipTrigger } from "@/components/editor/ui/tooltip";
import { Button } from "@/components/editor/ui/button";
import { ToolbarTooltip, type BindTooltip } from "../ToolbarTooltip";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/toolbars/formatting/groups/ClearFormatButton.tsx#messages:1">`
zh-Hans:
  clearFormatting: "清除格式"
en:
  clearFormatting: "Clear formatting"
ja:
  clearFormatting: "書式をクリア"
`;
const t = createTranslator(messages);


export function ClearFormatButton({
  onClear,
  bindTooltip,
}: {
  onClear: () => void;
  bindTooltip: BindTooltip;
}) {
  useLocale();
  return (
    <Tooltip {...bindTooltip("clear")}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          aria-label={t("clearFormatting")}
          className="goose-formatting-toolbar-control"
        >
          <GooseIcons.Eraser className="h-[15px] w-[15px]" />
        </Button>
      </TooltipTrigger>
      <ToolbarTooltip label={t("clearFormatting")} />
    </Tooltip>
  );
}
