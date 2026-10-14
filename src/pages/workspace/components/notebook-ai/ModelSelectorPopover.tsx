import { Button } from "@/components/ui/button";
/**
 * 侧边 AI 模型选择器 — 默认跟随设置里配置的模型，
 * 切换后写入 workspaceSelectedModelId 作为工作区级覆盖，
 * 重新选回默认模型时清除覆盖。
 */
import { useMemo, useState } from "react";
import { Check, ChevronDown } from "@/components/ui/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSettings } from "@/stores/useSettings";

interface ModelSelectorPopoverProps {
  disabled?: boolean;
}

export function ModelSelectorPopover({ disabled }: ModelSelectorPopoverProps) {
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

  // 默认选中设置配置的模型；工作区覆盖失效（模型已不在列表中）时回退默认。
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
          className="flex h-7 max-w-[12.5rem] shrink-0 items-center gap-0.5 rounded-[var(--goose-control-radius)] px-1 text-[11px] text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:text-disabled"
          aria-label="切换模型"
          title={`当前模型：${effectiveModel?.id ?? effectiveModelId}`}
        >
          <span className="min-w-0 truncate">
            {effectiveModel?.label ?? effectiveModelId}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0" strokeWidth={1.75} />
        </Button>
      </PopoverTrigger>
      {/*
        触发器在输入条右侧、发送按钮左边：align="end" 让菜单贴右缘往左展，
        窄侧栏里不会把宽菜单甩出面板。
      */}
      <PopoverContent
        side="top"
        align="end"
        sideOffset={6}
        collisionPadding={12}
        className="w-56 p-1.5"
      >
        <div className="px-2 pb-1.5 pt-1 text-xs text-muted-foreground">
          选择模型
        </div>
        <div className="goose-list-layout">
          {customModelOptions.map((option) => {
            const isActive = option.id === effectiveModelId;
            const isDefault = option.id === selectedModelId;
            return (
              <Button contentStyle="preserve" variant="ghost" size={null}
                key={option.id}
                type="button"
                onClick={() => selectModel(option.id)}
                className="goose-list-row goose-accent-selection flex w-full items-center gap-2 rounded-[var(--goose-control-radius)] px-2 py-1.5 text-left text-foreground transition-colors "
                data-selected={isActive || undefined}
                aria-pressed={isActive}
                title={option.id}
              >
                <span className="min-w-0 flex-1 truncate text-sm">
                  {option.label}
                </span>
                {isDefault ? (
                  <span className="shrink-0 rounded-[4px] bg-[var(--goose-interactive-selected)] px-1 py-px text-[10px] text-[var(--goose-interactive-selected-fg)]">
                    默认
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
