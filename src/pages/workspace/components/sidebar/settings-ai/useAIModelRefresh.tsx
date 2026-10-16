import { isModelRequestBusy } from "./aiRequestState";
import { toast } from "@/components/ui/sonner";
import {
  DEFAULT_CLAUDE_BASE_URL,
  DEFAULT_OPENAI_BASE_URL,
  fetchCustomAIModels,
  getAIProviderPreset,
  getProviderFixedBaseURL,
  isAIProviderId,
  resolveProtocolForProvider,
  type CustomAIProtocol,
} from "@/lib/ai-provider";
import {
  areSetupGuideAIConnectionsEqual,
  redactSetupGuideAIError,
} from "@/lib/setupGuideAI";
import {
  CUSTOM_AI_KEY_HINT,
  type ProviderConnection,
  readStoredApiKey,
} from "./shared";
import type { useAIConnectionTest } from "./useAIConnectionTest";

export function useAIModelRefresh(
  input: ReturnType<typeof useAIConnectionTest>,
) {
  const {
    ai,
    selectedModelId,
    setSelectedModelId,
    saveCustomConfig,
    isOnboarding,
    providerId,
    setProviderId,
    setCustomBaseURL,
    apiKeyDraft,
    setApiKeyDraft,
    sendRequestEvent,
    requestStateRef,
    dismissModelError,
    modelRequestIdRef,
    modelAbortControllerRef,
    modelTimeoutRef,
    isMountedRef,
    cancelModelRefresh,
    cancelConnectionTest,
    storedCustomModels,
    customModels,
    getConnectionForProvider,
    savedConnection,
    scrollToModelSection,
    saveButtonReason,
  } = input;

  const refreshCustomModels = async (
    connection: ProviderConnection,
    action: "save" | "switch" | "refresh",
  ) => {
    if (isModelRequestBusy(requestStateRef.current.models) || requestStateRef.current.test.status === "testing") return;
    const apiKey = connection.apiKey.trim();
    if (!apiKey) {
      toast.error(CUSTOM_AI_KEY_HINT);
      return;
    }

    const provider = getAIProviderPreset(connection.providerId);
    if (isOnboarding) cancelModelRefresh();
    const requestId = ++modelRequestIdRef.current;
    const controller = isOnboarding ? new AbortController() : null;
    if (controller) {
      modelAbortControllerRef.current = controller;
      modelTimeoutRef.current = setTimeout(() => {
        if (requestId !== modelRequestIdRef.current || !isMountedRef.current) {
          return;
        }
        const message = "获取模型列表超时（30 秒），配置已保存，可重试。";
        sendRequestEvent({ type: "models.failed", requestId, message });
        modelRequestIdRef.current += 1;
        modelAbortControllerRef.current = null;
        modelTimeoutRef.current = null;
        controller.abort();
        toast.error(message, {
          description: action === "refresh" ? "模型列表未更新，已保留当前配置。" : "API Key 已保存，模型列表未能更新。",
        });
      }, 30_000);
    }
    sendRequestEvent({ type: "models.started", requestId, action });

    try {
      // 先持久化供应商 / Key / Base URL，避免拉模型失败时配置丢失。
      const sameSavedConnection = areSetupGuideAIConnectionsEqual(
        { ...connection, apiKey },
        savedConnection,
      );
      const previousModelOptions = sameSavedConnection ? storedCustomModels : [];
      saveCustomConfig({
        providerId: connection.providerId,
        protocol: connection.protocol,
        baseURL: connection.baseURL,
        apiKey,
        modelOptions: previousModelOptions,
      });

      sendRequestEvent({ type: "models.configSaved", requestId });
      // DeepSeek 模型列表走兼容 /models；协议按模型在请求时分支。
      const listProtocol: CustomAIProtocol =
        connection.providerId === "deepseek" ? "openai" : connection.protocol;
      const modelOptions = await fetchCustomAIModels({
        protocol: listProtocol,
        baseURL: connection.baseURL,
        apiKey,
        providerId: connection.providerId,
        signal: controller?.signal,
      });
      if (
        !isMountedRef.current ||
        requestId !== modelRequestIdRef.current ||
        controller?.signal.aborted
      ) {
        return;
      }

      const nextModel =
        modelOptions.find((model) => model.id === selectedModelId) ??
        modelOptions[0] ??
        null;
      const nextProtocol = resolveProtocolForProvider(
        connection.providerId,
        nextModel?.id ?? null,
        connection.protocol,
      );

      saveCustomConfig({
        providerId: connection.providerId,
        protocol: nextProtocol,
        baseURL: connection.baseURL,
        apiKey,
        modelOptions,
      });

      sendRequestEvent({ type: "models.loaded", requestId, count: modelOptions.length });
      setSelectedModelId(nextModel?.id ?? null);
      scrollToModelSection();

      if (modelOptions.length === 0) {
        toast.warning(`${provider.label} 配置已保存`, {
          description: "已获取 0 个模型，请确认该服务是否提供模型列表接口。",
        });
      } else {
        const actionLabel =
          action === "switch"
            ? `已切换到 ${provider.label}`
            : action === "refresh"
              ? `${provider.label} 模型列表已更新`
              : `${provider.label} 配置已保存`;
        toast.success(actionLabel, {
          description: `已获取 ${modelOptions.length} 个模型，默认选择 ${nextModel?.label ?? nextModel?.id}。`,
        });
      }
    } catch (error) {
      if (!isMountedRef.current || requestId !== modelRequestIdRef.current) {
        return;
      }
      if (controller?.signal.aborted) return;
      const rawMessage =
        error instanceof Error ? error.message : "获取模型列表失败";
      const message = redactSetupGuideAIError(rawMessage, apiKey) || "获取模型列表失败";
      const configSaved = requestStateRef.current.models.status === "loading";
      sendRequestEvent({ type: "models.failed", requestId, message });
      toast.error(message, {
        description: !configSaved ? "服务配置未能保存。" :
          action === "refresh"
            ? "模型列表未更新，已保留当前配置。"
            : "API Key 已保存，模型列表未能更新。",
      });
    } finally {
      if (requestId === modelRequestIdRef.current) {
        if (modelTimeoutRef.current) clearTimeout(modelTimeoutRef.current);
        modelTimeoutRef.current = null;
        modelAbortControllerRef.current = null;
      }
    }
  };

  const handleSaveCustomConfig = async () => {
    if (saveButtonReason) {
      toast.error(saveButtonReason);
      return;
    }
    await refreshCustomModels(getConnectionForProvider(providerId), "save");
  };

  const handleProviderChange = (value: string) => {
    if (!isAIProviderId(value) || value === providerId ||
      isModelRequestBusy(requestStateRef.current.models) || requestStateRef.current.test.status === "testing") return;
    dismissModelError();
    if (isOnboarding) {
      cancelModelRefresh();
      cancelConnectionTest();
      setProviderId(value);

      const nextPreset = getAIProviderPreset(value);
      const nextBaseURL =
        getProviderFixedBaseURL(value) ??
        (nextPreset.protocol === "claude"
          ? DEFAULT_CLAUDE_BASE_URL
          : DEFAULT_OPENAI_BASE_URL);
      setCustomBaseURL(nextBaseURL);
      // Credential slots are shared by protocol, not by provider. Never carry
      // a draft key over to a different host before the user saves explicitly.
      setApiKeyDraft("");
      return;
    }

    setProviderId(value);

    const nextPreset = getAIProviderPreset(value);
    const nextBaseURL =
      getProviderFixedBaseURL(value) ??
      (nextPreset.protocol === "claude"
        ? DEFAULT_CLAUDE_BASE_URL
        : DEFAULT_OPENAI_BASE_URL);
    setCustomBaseURL(nextBaseURL);

    // 仅当切回当前已保存供应商时复用草稿 Key；否则只读该供应商在 store 中的 Key，避免串用。
    const finalKey =
      value === ai.customProviderId
        ? apiKeyDraft
        : readStoredApiKey(ai, value, nextPreset.protocol);
    setApiKeyDraft(finalKey);

    if (!finalKey.trim()) {
      toast.info(`已切换到 ${nextPreset.label}`, {
        description: "填写 API Key 并保存后，将自动获取模型列表。",
      });
      return;
    }

    void refreshCustomModels(
      getConnectionForProvider(value, finalKey, nextBaseURL),
      "switch",
    );
  };

  const handleModelChange = (modelId: string) => {
    if (isModelRequestBusy(requestStateRef.current.models)) return;
    if (isOnboarding) cancelConnectionTest();
    dismissModelError();
    setSelectedModelId(modelId);
    // DeepSeek 选 Pro/Flash 时协议会变；若已有 Key，同步持久化协议槽位。
    if (providerId !== "deepseek" || !apiKeyDraft.trim()) return;
    const connection = getConnectionForProvider(providerId);
    const protocol = resolveProtocolForProvider(
      providerId,
      modelId,
      connection.protocol,
    );
    saveCustomConfig({
      providerId,
      protocol,
      baseURL: connection.baseURL,
      apiKey: connection.apiKey.trim(),
      modelOptions: customModels,
    });
  };
  return {
    ...input,
    refreshCustomModels,
    handleSaveCustomConfig,
    handleProviderChange,
    handleModelChange,
  };
}
