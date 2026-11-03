import { useCallback, useMemo, useState } from "react";
import {
  isAIProviderId,
  resolveProtocolForProvider,
  type AIModelOption,
  type AIProviderId,
  type CustomAIProtocol,
} from "@/lib/ai-provider";
import { createAISlice, type AISlice } from "@/stores/settings/slices/aiSlice";
import { normalizeAISettings, type AISettings } from "@/stores/settings/types/ai";

function nextAI(current: AISettings, update: (slice: AISlice, read: () => AISettings) => void): AISettings {
  let next = current;
  const slice = createAISlice((updater) => {
    const partial = typeof updater === "function" ? updater({ ai: next } as AISlice) : updater;
    next = partial.ai ?? next;
  });
  update(slice, () => next);
  return next;
}

/** Keeps the onboarding form's writes in memory. Nothing here touches storage. */
export function useAISetupDraft(settings: AISettings) {
  const [ai, setAI] = useState(() => normalizeAISettings(settings));
  const apply = useCallback((update: (slice: AISlice, read: () => AISettings) => void) => {
    setAI((current) => nextAI(current, update));
  }, []);

  return useMemo(() => ({
    ai,
    setEnabled: (enabled: boolean) => apply((slice) => slice.setAIEnabled(enabled)),
    setReadGlobalPrompt: (enabled: boolean) => apply((slice) => slice.setAIReadGlobalPrompt(enabled)),
    setReadLocalSkills: (enabled: boolean) => apply((slice) => slice.setAIReadLocalSkills(enabled)),
    setSelectedModelId: (modelId: string | null) => apply((slice) => slice.setAISelectedModelId(modelId)),
    saveCustomConfig: (config: {
      providerId: AIProviderId;
      protocol?: CustomAIProtocol;
      baseURL: string;
      apiKey: string;
      modelOptions: AIModelOption[];
    }) => apply((slice, read) => {
      const providerId = isAIProviderId(config.providerId) ? config.providerId : "deepseek";
      slice.saveAICustomConfig({
        ...config,
        providerId,
        protocol: config.protocol ?? resolveProtocolForProvider(providerId, read().selectedModelId),
      });
    }),
  }), [ai, apply]);
}
