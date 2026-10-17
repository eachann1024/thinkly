import * as GooseIcons from "@/components/ui/icons";
import { Tooltip, TooltipTrigger } from "@/components/editor/ui/tooltip";
import { Button } from "@/components/editor/ui/button";
import { ToolbarTooltip, type BindTooltip } from "../ToolbarTooltip";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/toolbars/formatting/groups/AiButton.tsx#messages:1">`
zh-Hans:
  polishWithAi: "AI 润色"
en:
  polishWithAi: "Polish with AI"
ja:
  polishWithAi: "AI で推敲"
`;
const t = createTranslator(messages);


export function AiButton({
  onActivate,
  bindTooltip,
}: {
  onActivate: () => void;
  bindTooltip: BindTooltip;
}) {
  useLocale();
  return (
    <Tooltip {...bindTooltip("ai-polish")}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onActivate}
          aria-label={t("polishWithAi")}
          className="goose-formatting-toolbar-control"
        >
          <GooseIcons.Sparkles className="h-[15px] w-[15px]" />
        </Button>
      </TooltipTrigger>
      <ToolbarTooltip label={t("polishWithAi")} />
    </Tooltip>
  );
}
