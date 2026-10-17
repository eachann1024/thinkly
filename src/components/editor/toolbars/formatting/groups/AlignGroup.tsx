import * as GooseIcons from "@/components/ui/icons";
import { Tooltip, TooltipTrigger } from "@/components/editor/ui/tooltip";
import { Toggle } from "@/components/editor/ui/toggle";
import { ToolbarTooltip, type BindTooltip } from "../ToolbarTooltip";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/toolbars/formatting/groups/AlignGroup.tsx#messages:1">`
zh-Hans:
  alignLeft: "左对齐"
  alignCenter: "居中对齐"
  alignRight: "右对齐"
en:
  alignLeft: "Align left"
  alignCenter: "Align center"
  alignRight: "Align right"
ja:
  alignLeft: "左揃え"
  alignCenter: "中央揃え"
  alignRight: "右揃え"
`;
const t = createTranslator(messages);


const ITEM_CLASS = "goose-formatting-toolbar-control";

export function AlignGroup({
  textAlignment,
  setTextAlignment,
  bindTooltip,
}: {
  textAlignment: string;
  setTextAlignment: (alignment: "left" | "center" | "right") => void;
  bindTooltip: BindTooltip;
}) {
  useLocale();
  return (
    <>
      <Tooltip {...bindTooltip("align-left")}>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={textAlignment === "left"}
            onPressedChange={() => setTextAlignment("left")}
            aria-label={t("alignLeft")}
            className={ITEM_CLASS}
          >
            <GooseIcons.AlignLeft className="h-[15px] w-[15px]" />
          </Toggle>
        </TooltipTrigger>
        <ToolbarTooltip label={t("alignLeft")} />
      </Tooltip>

      <Tooltip {...bindTooltip("align-center")}>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={textAlignment === "center"}
            onPressedChange={() => setTextAlignment("center")}
            aria-label={t("alignCenter")}
            className={ITEM_CLASS}
          >
            <GooseIcons.AlignCenter className="h-[15px] w-[15px]" />
          </Toggle>
        </TooltipTrigger>
        <ToolbarTooltip label={t("alignCenter")} />
      </Tooltip>

      <Tooltip {...bindTooltip("align-right")}>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={textAlignment === "right"}
            onPressedChange={() => setTextAlignment("right")}
            aria-label={t("alignRight")}
            className={ITEM_CLASS}
          >
            <GooseIcons.AlignRight className="h-[15px] w-[15px]" />
          </Toggle>
        </TooltipTrigger>
        <ToolbarTooltip label={t("alignRight")} />
      </Tooltip>
    </>
  );
}
