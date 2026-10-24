import { useLocale } from "@/i18n";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Check, ChevronDown } from "@/components/ui/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSettings } from "@/stores/useSettings";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ModelSelectorPopover.tsx#messages:1">`
zh-Hans:
  switchModel: "切换模型"
  default: "默认"
  detailCurrentModel: "当前模型：{{value1}}"
en:
  switchModel: "Switch model"
  default: "Default"
  detailCurrentModel: "Current model: {{value1}}"
ja:
  switchModel: "モデルを切り替え"
  default: "デフォルト"
  detailCurrentModel: "現在のモデル：{{value1}}"
`;
const t = createTranslator(messages);


interface ModelSelectorPopoverProps {
  disabled?: boolean;
}

export function ModelSelectorPopover({ disabled }: ModelSelectorPopoverProps) {
  useLocale();
  const [open, setOpen] = useState(false);
  const customModelOptions = useSettings(
    (state) => state.ai.customModelOptions,
  );
  const selectedModelId = useSettings((state) => state.ai.selectedModelId);
  const workspaceSelectedModelId = useSettings(
    (state) => state.ai.workspaceSelectedModelId,
  );
  const setAIWorkspaceSelectedModelId = useSettings(
    (state) => state.setAIWorkspaceSelectedModelId,
  );

  const effectiveModelId = useMemo(() => {
    if (
      workspaceSelectedModelId &&
      customModelOptions.some(
        (option) => option.id === workspaceSelectedModelId,
      )
    ) {
      return workspaceSelectedModelId;
    }
    return selectedModelId ?? customModelOptions[0]?.id ?? null;
  }, [customModelOptions, selectedModelId, workspaceSelectedModelId]);

  if (customModelOptions.length === 0 || !effectiveModelId) return null;

  const effectiveModel =
    customModelOptions.find((option) => option.id === effectiveModelId) ?? null;

  const selectModel = (modelId: string) => {
    setAIWorkspaceSelectedModelId(modelId === selectedModelId ? null : modelId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button contentStyle="preserve" variant="ghost" size={null}
          type="button"
          disabled={disabled}
          className="notebook-ai-model-trigger flex shrink items-center rounded-[var(--goose-control-radius)] text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:text-disabled"
          aria-label={t("switchModel")}
          title={t("detailCurrentModel", { value1: effectiveModel?.id ?? effectiveModelId })}
        >
          <span className="min-w-0 max-w-[12.5rem] truncate">
            {effectiveModel?.label ?? effectiveModelId}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        variant="menu"
        side="top"
        align="center"
        sideOffset={6}
        collisionPadding={12}
        className="notebook-ai-model-menu max-w-[calc(100vw-24px)] overflow-x-hidden overflow-y-auto p-2"
      >
        <div className="goose-list-layout">
          {customModelOptions.map((option) => {
            const isActive = option.id === effectiveModelId;
            const isDefault = option.id === selectedModelId;
            return (
              <Button contentStyle="preserve" variant="ghost" size={null}
                key={option.id}
                type="button"
                onClick={() => selectModel(option.id)}
                className="goose-menu-item goose-list-row goose-accent-selection flex w-full items-center gap-2 rounded-[var(--goose-control-radius)] px-2 py-1.5 text-left text-foreground transition-colors "
                data-selected={isActive || undefined}
                aria-pressed={isActive}
                title={option.id}
              >
                <span className="min-w-0 flex-1 truncate goose-menu-title [overflow-wrap:anywhere]">
                  {option.label}
                </span>
                {isDefault ? (
                  <span className="shrink-0 rounded-[4px] bg-[var(--goose-interactive-selected)] px-1.5 py-px text-[0.75rem] text-[var(--goose-interactive-selected-fg)]">
                    {t("default")}
                  </span>
                ) : null}
                {isActive ? (
                  <Check
                    className="h-3.5 w-3.5 shrink-0 text-[var(--goose-interactive-selected-fg)]"
                    strokeWidth={2}
                  />
                ) : null}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
