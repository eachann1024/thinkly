import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { aiRequestReducer, initialAIRequestState, isModelRequestBusy, type AIRequestEvent } from "./aiRequestState";
import { isAIProviderId, type AIProviderId } from "@/lib/ai-provider";
import {
  type SettingsAIProps,
  readStoredApiKey,
  readStoredBaseURL,
} from "./shared";

export function useAISettingsDraft({
  visible = true,
  mode = "settings",
  onSetupStateChange,
  ai,
  enabled,
  setEnabled,
  setReadGlobalPrompt,
  setReadLocalSkills,
  selectedModelId,
  setSelectedModelId,
  saveCustomConfig,
}: SettingsAIProps) {
  const isOnboarding = mode === "onboarding";

  const initialProviderId: AIProviderId = isAIProviderId(ai.customProviderId)
    ? ai.customProviderId
    : "deepseek";

  const [providerId, setProviderId] = useState<AIProviderId>(initialProviderId);

  const [customBaseURL, setCustomBaseURL] = useState(() =>
    readStoredBaseURL(ai, initialProviderId, ai.customProtocol),
  );

  const [apiKeyDraft, setApiKeyDraft] = useState(() =>
    readStoredApiKey(ai, initialProviderId, ai.customProtocol),
  );

  const [requests, dispatchRequests] = useReducer(aiRequestReducer, initialAIRequestState);
  const requestStateRef = useRef(requests);
  const sendRequestEvent = useCallback((event: AIRequestEvent) => {
    requestStateRef.current = aiRequestReducer(requestStateRef.current, event);
    dispatchRequests(event);
  }, []);
  const savingCustomConfig = isModelRequestBusy(requests.models);
  const customSaveError = requests.models.status === "failed" ? requests.models.message : null;
  const testingConnection = requests.test.status === "testing";
  const connectionTestResult = requests.test.status === "testing" ? "idle" : requests.test.status;
  const connectionTestMessage = "message" in requests.test ? requests.test.message : "";
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const dismissModelError = () => sendRequestEvent({ type: "models.errorDismissed" });

  const modelSectionRef = useRef<HTMLDivElement | null>(null);

  const modelRequestIdRef = useRef(0);

  const modelAbortControllerRef = useRef<AbortController | null>(null);

  const modelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectionTestRequestIdRef = useRef(0);

  const connectionTestControllerRef = useRef<AbortController | null>(null);

  const connectionTestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const isMountedRef = useRef(false);

  const setupStateCallbackRef = useRef(onSetupStateChange);

  useEffect(() => {
    setupStateCallbackRef.current = onSetupStateChange;
  }, [onSetupStateChange]);

  const cancelModelRefresh = useCallback(() => {
    const controller = modelAbortControllerRef.current;

    modelRequestIdRef.current += 1;
    controller?.abort();
    modelAbortControllerRef.current = null;
    if (modelTimeoutRef.current) clearTimeout(modelTimeoutRef.current);
    modelTimeoutRef.current = null;
    if (isMountedRef.current) sendRequestEvent({ type: "models.cancelled" });
  }, [sendRequestEvent]);

  const cancelConnectionTest = useCallback(() => {
    connectionTestRequestIdRef.current += 1;
    connectionTestControllerRef.current?.abort();
    connectionTestControllerRef.current = null;
    if (connectionTestTimeoutRef.current) {
      clearTimeout(connectionTestTimeoutRef.current);
    }
    connectionTestTimeoutRef.current = null;
    if (isMountedRef.current) {
      sendRequestEvent({ type: "test.cancelled" });
    }
  }, [sendRequestEvent]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      modelRequestIdRef.current += 1;
      connectionTestRequestIdRef.current += 1;
      if (modelTimeoutRef.current) clearTimeout(modelTimeoutRef.current);
      if (connectionTestTimeoutRef.current) {
        clearTimeout(connectionTestTimeoutRef.current);
      }
      modelAbortControllerRef.current?.abort();
      connectionTestControllerRef.current?.abort();
      modelTimeoutRef.current = null;
      connectionTestTimeoutRef.current = null;
      modelAbortControllerRef.current = null;
      connectionTestControllerRef.current = null;
    };
  }, []);

  const previousModelDraftRef = useRef({
    providerId,
    customBaseURL,
    apiKeyDraft,
    selectedModelId,
  });

  useEffect(() => {
    const previous = previousModelDraftRef.current;
    const changed =
      previous.providerId !== providerId ||
      previous.customBaseURL !== customBaseURL ||
      previous.apiKeyDraft !== apiKeyDraft ||
      previous.selectedModelId !== selectedModelId;
    previousModelDraftRef.current = {
      providerId,
      customBaseURL,
      apiKeyDraft,
      selectedModelId,
    };
    if (isOnboarding && changed) cancelModelRefresh();
  }, [
    apiKeyDraft,
    cancelModelRefresh,
    customBaseURL,
    isOnboarding,
    providerId,
    selectedModelId,
  ]);
  return {
    visible,
    mode,
    onSetupStateChange,
    ai,
    enabled,
    setEnabled,
    setReadGlobalPrompt,
    setReadLocalSkills,
    selectedModelId,
    setSelectedModelId,
    saveCustomConfig,
    isOnboarding,
    initialProviderId,
    providerId,
    setProviderId,
    customBaseURL,
    setCustomBaseURL,
    apiKeyDraft,
    setApiKeyDraft,
    requestStateRef,
    sendRequestEvent,
    dismissModelError,
    savingCustomConfig,
    customSaveError,
    apiKeyVisible,
    setApiKeyVisible,
    testingConnection,
    connectionTestResult,
    connectionTestMessage,
    modelSectionRef,
    modelRequestIdRef,
    modelAbortControllerRef,
    modelTimeoutRef,
    connectionTestRequestIdRef,
    connectionTestControllerRef,
    connectionTestTimeoutRef,
    isMountedRef,
    setupStateCallbackRef,
    cancelModelRefresh,
    cancelConnectionTest,
    previousModelDraftRef,
  };
}
