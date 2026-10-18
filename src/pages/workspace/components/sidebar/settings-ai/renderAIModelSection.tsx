import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings-ai/renderAIModelSection.tsx#localMessages:1">`
zh-Hans:
  aiModels_a342: "AI 模型"
  fetchingModels_e925: "正在获取模型…"
  fetchError: "获取失败：{{error}}"
  availableModels: "{{count}} 个可用模型"
  saveTheServiceConfigurationToFetch_d515: "请先保存服务配置以获取模型"
  fetching_43c6: "获取中…"
  refreshModels_3d7d: "重新获取模型"
  defaultModel_b11d: "默认模型"
  selectAModel_0e34: "请选择模型"
en:
  aiModels_a342: "AI models"
  fetchingModels_e925: "Fetching models…"
  fetchError: "Fetch failed: {{error}}"
  availableModels: "Available models: {{count}}"
  saveTheServiceConfigurationToFetch_d515: "Save the service configuration to fetch models"
  fetching_43c6: "Fetching…"
  refreshModels_3d7d: "Refresh models"
  defaultModel_b11d: "Default model"
  selectAModel_0e34: "Select a model"
ja:
  aiModels_a342: "AI モデル"
  fetchingModels_e925: "モデルを取得しています…"
  fetchError: "取得に失敗しました: {{error}}"
  availableModels: "利用可能なモデル: {{count}} 件"
  saveTheServiceConfigurationToFetch_d515: "モデルを取得するには、先にサービス設定を保存してください"
  fetching_43c6: "取得中…"
  refreshModels_3d7d: "モデルを再取得"
  defaultModel_b11d: "デフォルトモデル"
  selectAModel_0e34: "モデルを選択してください"
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SettingsSectionCard } from "../settings/SettingsSectionCard";
import { cn } from "@/lib/utils";
import type { useAIModelRefresh } from "./useAIModelRefresh";
import { SETTINGS_OPTION_ROW_CLASS } from "./shared";

export function renderAIModelSection(
  context: ReturnType<typeof useAIModelRefresh>,
) {
  const {
    selectedModelId,
    isOnboarding,
    providerId,
    savingCustomConfig,
    customSaveError,
    testingConnection,
    modelSectionRef,
    customModels,
    currentModel,
    getConnectionForProvider,
    saveButtonReason,
    modelButtonDisabled,
    modelButtonReason,
    refreshCustomModels,
    handleModelChange,
  } = context;
  return (
    <div
      ref={modelSectionRef}
      id="ai-model-settings"
      tabIndex={-1}
      className="scroll-mt-6 rounded-[14px] outline-none "
    >
      <SettingsSectionCard
        className={isOnboarding ? "p-4" : undefined}
        title={
          <span className="flex items-center gap-2">
            <GooseIcons.Brain
              className="h-4 w-4 shrink-0 text-muted-foreground"
              strokeWidth={1.75}
            />
            {uiText("aiModels_a342")}</span>
        }
        description={
          <span role="status" aria-live="polite">
            {savingCustomConfig
              ? uiText("fetchingModels_e925")
              : customSaveError
                ? uiText("fetchError", { error: customSaveError })
                : customModels.length > 0
                  ? uiText("availableModels", { count: customModels.length })
                  : uiText("saveTheServiceConfigurationToFetch_d515")}
          </span>
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            disabled={Boolean(saveButtonReason) || testingConnection}
            onClick={() => {
              void refreshCustomModels(
                getConnectionForProvider(providerId),
                "refresh",
              );
            }}
          >
            {savingCustomConfig ? (
              <GooseIcons.LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <GooseIcons.RefreshCw className="h-4 w-4" />
            )}
            {savingCustomConfig ? uiText("fetching_43c6") : uiText("refreshModels_3d7d")}
          </Button>
        }
      >
        <div className="space-y-3">
          <div
            className={cn(
              "settings-ai-pick-row flex items-center justify-between gap-3",
              SETTINGS_OPTION_ROW_CLASS,
            )}
          >
            <div className="flex items-center gap-3">
              <GooseIcons.Cpu
                className="h-4 w-4 shrink-0 text-muted-foreground"
                strokeWidth={1.75}
              />
              <div className="space-y-1">
                <Label className="text-sm font-medium leading-5 text-foreground">
                  {uiText("defaultModel_b11d")}</Label>
              </div>
            </div>
            <TooltipProvider delayDuration={600}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={modelButtonDisabled}
                          className={cn(
                            "min-w-[220px] justify-between rounded-[var(--goose-control-radius)]",
                            modelButtonDisabled && "cursor-not-allowed",
                          )}
                        >
                          <span className="truncate">
                            {currentModel?.label ??
                              modelButtonReason ??
                              uiText("selectAModel_0e34")}
                          </span>
                          <GooseIcons.ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-[280px]"
                        style={{
                          maxHeight: "min(360px, var(--available-height))",
                        }}
                      >
                        <DropdownMenuRadioGroup
                          value={selectedModelId ?? ""}
                          onValueChange={handleModelChange}
                        >
                          {customModels.map((model) => (
                            <DropdownMenuRadioItem
                              key={model.id}
                              value={model.id}
                              className="goose-menu-item-multiline items-start"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate goose-menu-title">
                                  {model.label}
                                </div>
                                <div className="line-clamp-2 goose-menu-description">
                                  {model.description || model.id}
                                </div>
                              </div>
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TooltipTrigger>
                {modelButtonReason ? (
                  <TooltipContent side="left">
                    {modelButtonReason}
                  </TooltipContent>
                ) : null}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </SettingsSectionCard>
    </div>
  );
}
