import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings-ai/renderAIConnectionTestSection.tsx#localMessages:1">`
zh-Hans:
  connectionCheck_58bb: "连接测试"
  thisCheckDoesNotReadNotes_a76b: "测试不会读取笔记或本地上下文。"
  checking_2ff3: "测试中…"
  checkConnection_69e7: "测试连接"
  cancelCheck_ca80: "取消测试"
  checkingConnection_3d70: "正在测试连接…"
  enableTheAiAssistantSaveA_9011: "启用 AI 并保存配置、获取模型后可测试连接。"
  saveTheCurrentProviderConfigurationFirst_3c68: "请先保存当前服务商配置。"
  saveTheConfigurationAndFetchAvailable_11da: "请先保存配置并获取可用模型。"
  readyToCheckTheConnection_542d: "可以开始测试。"
en:
  connectionCheck_58bb: "Connection check"
  thisCheckDoesNotReadNotes_a76b: "This check does not read notes or local context."
  checking_2ff3: "Checking…"
  checkConnection_69e7: "Check connection"
  cancelCheck_ca80: "Cancel check"
  checkingConnection_3d70: "Checking connection…"
  enableTheAiAssistantSaveA_9011: "Enable the AI assistant, save a configuration, and fetch models to check the connection."
  saveTheCurrentProviderConfigurationFirst_3c68: "Save the current provider configuration first."
  saveTheConfigurationAndFetchAvailable_11da: "Save the configuration and fetch available models first."
  readyToCheckTheConnection_542d: "Ready to check the connection."
ja:
  connectionCheck_58bb: "接続テスト"
  thisCheckDoesNotReadNotes_a76b: "テストでノートやローカルのコンテキストが読み取られることはありません。"
  checking_2ff3: "テスト中…"
  checkConnection_69e7: "接続をテスト"
  cancelCheck_ca80: "テストをキャンセル"
  checkingConnection_3d70: "接続をテストしています…"
  enableTheAiAssistantSaveA_9011: "AI アシスタントを有効にし、設定を保存してモデルを取得すると、接続をテストできます。"
  saveTheCurrentProviderConfigurationFirst_3c68: "先に現在のプロバイダ設定を保存してください。"
  saveTheConfigurationAndFetchAvailable_11da: "先に設定を保存し、利用可能なモデルを取得してください。"
  readyToCheckTheConnection_542d: "接続をテストできます。"
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SettingsSectionCard } from "../settings/SettingsSectionCard";
import { cn } from "@/lib/utils";
import type { useAIModelRefresh } from "./useAIModelRefresh";
import { SETTINGS_OPTION_ROW_CLASS } from "./shared";

export function renderAIConnectionTestSection(
  context: ReturnType<typeof useAIModelRefresh>,
) {
  const {
    enabled,
    isOnboarding,
    testingConnection,
    connectionTestResult,
    connectionTestMessage,
    cancelConnectionTest,
    setupAIStatus,
    canTestConnection,
    handleTestConnection,
  } = context;
  return isOnboarding ? (
    <SettingsSectionCard
      className="p-4"
      title={uiText("connectionCheck_58bb")}
      description={uiText("thisCheckDoesNotReadNotes_a76b")}
    >
      <div className={cn(SETTINGS_OPTION_ROW_CLASS, "goose-settings-option-row--stack space-y-3")}>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!canTestConnection}
            onClick={() => void handleTestConnection()}
          >
            {testingConnection ? (
              <GooseIcons.LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <GooseIcons.PlugZap className="h-4 w-4" />
            )}
            {testingConnection ? uiText("checking_2ff3") : uiText("checkConnection_69e7")}
          </Button>
          {testingConnection ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelConnectionTest}
            >
              {uiText("cancelCheck_ca80")}</Button>
          ) : null}
        </div>
        <p
          className={cn(
            "text-[13px] leading-5",
            connectionTestResult === "success"
              ? "text-foreground"
              : connectionTestResult === "failed" ||
                  connectionTestResult === "timeout"
                ? "text-danger"
                : "text-muted-foreground",
          )}
          role="status"
          aria-live="polite"
        >
          {testingConnection
            ? uiText("checkingConnection_3d70")
            : connectionTestResult !== "idle"
              ? connectionTestMessage
              : !enabled
                ? uiText("enableTheAiAssistantSaveA_9011")
                : setupAIStatus.dirty
                  ? uiText("saveTheCurrentProviderConfigurationFirst_3c68")
                  : !setupAIStatus.ready
                    ? uiText("saveTheConfigurationAndFetchAvailable_11da")
                    : uiText("readyToCheckTheConnection_542d")}
        </p>
      </div>
    </SettingsSectionCard>
  ) : null;
}
