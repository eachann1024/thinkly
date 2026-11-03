import type { AuxiliaryAISetupConfig } from "@/lib/auxiliary-window/contract";
import {
  isAIProviderId,
  resolveProtocolForProvider,
  type AIModelOption,
  type CustomAIProtocol,
} from "@/lib/ai-provider";
import { useSettings } from "@/stores/useSettings";

const NOTICE_ID = "ai-writing-assistant";
const PROTOCOLS = new Set<CustomAIProtocol>(["openai-responses", "openai", "claude"]);

function modelOptions(value: AuxiliaryAISetupConfig["modelOptions"]): AIModelOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const label = typeof item.label === "string" ? item.label.trim() : "";
    if (!id || !label || id.length > 200 || label.length > 200) return [];
    const description = typeof item.description === "string" ? item.description.trim() : "";
    return [{ id, label, ...(description ? { description: description.slice(0, 400) } : {}) }];
  }).slice(0, 200);
}

function protocolOf(value: unknown): CustomAIProtocol | undefined {
  return typeof value === "string" && PROTOCOLS.has(value as CustomAIProtocol)
    ? value as CustomAIProtocol
    : undefined;
}

/** Applies an AI setup saved from the standalone window into this window's settings. */
export function applyAuxiliaryAISetup(config: AuxiliaryAISetupConfig): boolean {
  if (!config || typeof config !== "object") return false;
  if (!isAIProviderId(config.providerId)) return false;
  if (typeof config.baseURL !== "string" || typeof config.apiKey !== "string") return false;
  if (config.baseURL.length > 2_000 || config.apiKey.length > 4_000) return false;
  const models = modelOptions(config.modelOptions);
  const requested = typeof config.selectedModelId === "string" ? config.selectedModelId.trim() : "";
  const selectedModelId = models.some((model) => model.id === requested)
    ? requested
    : (models[0]?.id ?? null);
  const settings = useSettings.getState();
  settings.saveAICustomConfig({
    providerId: config.providerId,
    protocol: protocolOf(config.protocol) ?? resolveProtocolForProvider(config.providerId, selectedModelId),
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    modelOptions: models,
  });
  useSettings.getState().setAISelectedModelId(selectedModelId);
  if (config.enabled) useSettings.getState().setAIEnabled(true);
  useSettings.getState().dismissNotice(NOTICE_ID);
  return true;
}
