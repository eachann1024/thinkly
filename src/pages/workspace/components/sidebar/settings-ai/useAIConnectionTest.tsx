import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings-ai/useAIConnectionTest.tsx#localMessages:1">`
zh-Hans:
  theConnectionCheckTimedOutAfter_46bf: "连接测试超时（30 秒），请检查配置后重试。"
  connectionSuccessful_517b: "连接成功。"
  connectionFailedTheServiceDidNot_b320: "连接失败：服务未返回有效文本。"
  connectionFailedCheckTheConfigurationAnd_9da2: "连接失败，请检查配置后重试。"
  savingAndFetchingTheModelList_8623: "正在保存并读取模型列表"
  enterABaseUrl_463f: "请填写 Base URL"
  saveTheCurrentServiceConfigurationFirst_6e1e: "请先保存当前服务配置"
  enableTheAiAssistantBeforeSelecting_ff9e: "先打开 AI 助手开关后才能选择模型"
  fetchingTheModelListPleaseWait_e1a9: "模型列表读取中，请稍候"
  enterAnApiKeyAndSave_d9dc: "请先填写 API Key 并保存配置"
en:
  theConnectionCheckTimedOutAfter_46bf: "The connection check timed out after 30 seconds. Check the configuration and try again."
  connectionSuccessful_517b: "Connection successful."
  connectionFailedTheServiceDidNot_b320: "Connection failed: the service did not return valid text."
  connectionFailedCheckTheConfigurationAnd_9da2: "Connection failed. Check the configuration and try again."
  savingAndFetchingTheModelList_8623: "Saving and fetching the model list"
  enterABaseUrl_463f: "Enter a base URL"
  saveTheCurrentServiceConfigurationFirst_6e1e: "Save the current service configuration first"
  enableTheAiAssistantBeforeSelecting_ff9e: "Enable the AI assistant before selecting a model"
  fetchingTheModelListPleaseWait_e1a9: "Fetching the model list. Please wait."
  enterAnApiKeyAndSave_d9dc: "Enter an API key and save the configuration first"
`;
const uiText = createTranslator(localMessages);
import { isModelRequestBusy } from "./aiRequestState";
import { useEffect } from "react";
import { runAIText } from "@/lib/ai-provider";
import {
  hasValidSetupGuideAIResponse,
  isSetupGuideAIRequestCurrent,
  redactSetupGuideAIError,
} from "@/lib/setupGuideAI";
import { getCustomAiKeyHint } from "./shared";
import type { useAIProviderConnection } from "./useAIProviderConnection";

export function useAIConnectionTest(
  input: ReturnType<typeof useAIProviderConnection>,
) {
  useLocale();
  const {
    onSetupStateChange,
    ai,
    enabled,
    selectedModelId,
    isOnboarding,
    customBaseURL,
    apiKeyDraft,
    savingCustomConfig,
    customSaveError,
    sendRequestEvent,
    requestStateRef,
    modelSectionRef,
    connectionTestRequestIdRef,
    connectionTestControllerRef,
    connectionTestTimeoutRef,
    isMountedRef,
    setupStateCallbackRef,
    cancelConnectionTest,
    customModels,
    allowCustomBaseURL,
    savedConnection,
    setupAIStatus,
    canTestConnection,
    setupStatusBusy,
    setupStatusDirty,
    setupStatusReady,
  } = input;

  const handleTestConnection = async () => {
    if (!canTestConnection || !selectedModelId ||
      requestStateRef.current.test.status === "testing" ||
      isModelRequestBusy(requestStateRef.current.models)) return;

    cancelConnectionTest();
    const controller = new AbortController();
    const requestId = connectionTestRequestIdRef.current + 1;
    connectionTestRequestIdRef.current = requestId;
    connectionTestControllerRef.current = controller;
    sendRequestEvent({ type: "test.started", requestId });

    const timeoutId = setTimeout(() => {
      if (
        requestId !== connectionTestRequestIdRef.current ||
        !isMountedRef.current
      ) {
        return;
      }
      controller.abort();
      connectionTestRequestIdRef.current += 1;
      connectionTestControllerRef.current = null;
      connectionTestTimeoutRef.current = null;
      sendRequestEvent({ type: "test.resolved", requestId, result: "timeout",
        message: uiText("theConnectionCheckTimedOutAfter_46bf") });
    }, 30_000);
    connectionTestTimeoutRef.current = timeoutId;

    try {
      const response = await runAIText(
        {
          ...ai,
          enabled,
          selectedModelId,
          workspaceReasoningLevel: "default",
        },
        [{ role: "user", content: "请只回复“连接成功”。" }],
        {
          abortSignal: controller.signal,
          requestOverrides: {
            selectedModelId,
            reasoningLevel: "default",
          },
        },
      );

      if (
        !isSetupGuideAIRequestCurrent({
          requestId,
          currentRequestId: connectionTestRequestIdRef.current,
          alive: isMountedRef.current,
          signal: controller.signal,
        })
      ) {
        return;
      }

      if (hasValidSetupGuideAIResponse(response)) {
        sendRequestEvent({ type: "test.resolved", requestId, result: "success", message: uiText("connectionSuccessful_517b") });
      } else {
        sendRequestEvent({ type: "test.resolved", requestId, result: "failed", message: uiText("connectionFailedTheServiceDidNot_b320") });
      }
    } catch (error) {
      if (
        !isMountedRef.current ||
        requestId !== connectionTestRequestIdRef.current ||
        controller.signal.aborted
      ) {
        return;
      }
      const rawMessage =
        error instanceof Error ? error.message : uiText("connectionFailedCheckTheConfigurationAnd_9da2");
      const safeMessage = redactSetupGuideAIError(
        rawMessage,
        savedConnection.apiKey,
      );
      sendRequestEvent({ type: "test.resolved", requestId, result: "failed",
        message: safeMessage || uiText("connectionFailedCheckTheConfigurationAnd_9da2") });
    } finally {
      if (requestId === connectionTestRequestIdRef.current) {
        clearTimeout(timeoutId);
        if (connectionTestTimeoutRef.current === timeoutId) {
          connectionTestTimeoutRef.current = null;
        }
        connectionTestControllerRef.current = null;
      }
    }
  };

  const hasSetupStateCallback = Boolean(onSetupStateChange);

  useEffect(() => {
    if (!isOnboarding) return;
    setupStateCallbackRef.current?.({
      busy: setupStatusBusy,
      dirty: setupStatusDirty,
      ready: setupStatusReady,
    });
  }, [
    hasSetupStateCallback,
    isOnboarding,
    setupStatusBusy,
    setupStatusDirty,
    setupStatusReady,
  ]);

  const scrollToModelSection = () => {
    requestAnimationFrame(() => {
      const target = modelSectionRef.current;
      if (!target) return;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
      target.focus({ preventScroll: true });
    });
  };

  const saveButtonReason = savingCustomConfig
    ? uiText("savingAndFetchingTheModelList_8623")
    : !apiKeyDraft.trim()
      ? getCustomAiKeyHint()
      : allowCustomBaseURL && !customBaseURL.trim()
        ? uiText("enterABaseUrl_463f")
        : null;

  const modelButtonDisabled =
    !enabled ||
    savingCustomConfig ||
    customModels.length === 0 ||
    (isOnboarding && setupAIStatus.dirty);

  const modelButtonReason =
    isOnboarding && setupAIStatus.dirty
      ? uiText("saveTheCurrentServiceConfigurationFirst_6e1e")
      : !enabled
        ? uiText("enableTheAiAssistantBeforeSelecting_ff9e")
        : savingCustomConfig
          ? uiText("fetchingTheModelListPleaseWait_e1a9")
          : customSaveError
            ? customSaveError
            : customModels.length === 0
              ? uiText("enterAnApiKeyAndSave_d9dc")
              : null;
  return {
    ...input,
    handleTestConnection,
    hasSetupStateCallback,
    scrollToModelSection,
    saveButtonReason,
    modelButtonDisabled,
    modelButtonReason,
  };
}
