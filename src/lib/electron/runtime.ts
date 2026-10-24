import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/electron/runtime.ts#localMessages:1">`
zh-Hans:
  desktopIntegrationIsUnavailable: "window.gooseDesktop 不可用"
en:
  desktopIntegrationIsUnavailable: "Desktop integration is unavailable"
ja:
  desktopIntegrationIsUnavailable: "デスクトップ連携を利用できません"
`;
const uiText = createTranslator(localMessages);
export function isElectronRuntime(): boolean {
  return typeof window !== "undefined" && Boolean(window.gooseDesktop);
}

export function getGooseDesktop(): GooseDesktop | null {
  if (typeof window === "undefined") return null;
  return window.gooseDesktop ?? null;
}

export function requireGooseDesktop(): GooseDesktop {
  const api = getGooseDesktop();
  if (!api) {
    throw new Error(uiText("desktopIntegrationIsUnavailable"));
  }
  return api;
}
