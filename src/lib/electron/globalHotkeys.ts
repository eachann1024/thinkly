import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/electron/globalHotkeys.ts#localMessages:1">`
zh-Hans:
  desktopIntegrationIsUnavailable: "桌面桥不可用"
  finishRecordingBeforeRegisteringTheGlobalShortcut: "录制结束后才能注册全局快捷键"
  invalidShortcutRecordItAgain: "快捷键无效，请重新录制"
  theShortcutIsInvalidOrAlreadyUsedByAnother: "快捷键已被其他应用占用或无效"
  couldnTDisableTheShortcutTryAgain: "停用快捷键失败，请重试"
en:
  desktopIntegrationIsUnavailable: "Desktop integration is unavailable"
  finishRecordingBeforeRegisteringTheGlobalShortcut: "Finish recording before registering the global shortcut"
  invalidShortcutRecordItAgain: "Invalid shortcut. Record it again."
  theShortcutIsInvalidOrAlreadyUsedByAnother: "The shortcut is invalid or already used by another app"
  couldnTDisableTheShortcutTryAgain: "Couldn’t disable the shortcut. Try again."
ja:
  desktopIntegrationIsUnavailable: "デスクトップ連携を利用できません"
  finishRecordingBeforeRegisteringTheGlobalShortcut: "グローバルショートカットを登録するには、先に記録を完了してください"
  invalidShortcutRecordItAgain: "ショートカットが無効です。もう一度記録してください"
  theShortcutIsInvalidOrAlreadyUsedByAnother: "ショートカットが無効か、他のアプリで使用されています"
  couldnTDisableTheShortcutTryAgain: "ショートカットを無効にできませんでした。もう一度お試しください"
`;
const uiText = createTranslator(localMessages);
import type { HostHotkeyRegisterResult } from "@/lib/host/types";
import { toElectronAccelerator } from "./accelerator";
import { getGooseDesktop } from "./runtime";

export { toElectronAccelerator };

export type DesktopGlobalHotkeyId = "wake" | "quicknote" | "search";
export type DesktopGlobalHotkeySlot = { shortcut: string; enabled: boolean };
export type DesktopGlobalHotkeyInput = Record<
  DesktopGlobalHotkeyId,
  DesktopGlobalHotkeySlot
>;
export type DesktopGlobalHotkeyResults = Record<
  DesktopGlobalHotkeyId,
  HostHotkeyRegisterResult
> & { deferred?: boolean };

type HotkeyRequest = Record<DesktopGlobalHotkeyId, string>;
type RegistrationReply = {
  wakeOk: boolean;
  quicknoteOk: boolean;
  searchOk: boolean;
  paused?: boolean;
};

const current: HotkeyRequest = { wake: "", quicknote: "", search: "" };
let queue: Promise<unknown> = Promise.resolve();
let needsResume = false;

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.then(() => undefined, () => undefined);
  return next;
}

function resolvedShortcut(shortcut: string, enabled: boolean) {
  if (!enabled || !shortcut.trim()) return { value: "", invalid: false };
  if (!toElectronAccelerator(shortcut)) return { value: "", invalid: true };
  return { value: shortcut, invalid: false };
}

function resultForSlot(
  slot: { value: string; invalid: boolean },
  ok: boolean,
  bridgeMissing: boolean,
  deferred = false,
): HostHotkeyRegisterResult {
  if (bridgeMissing) {
    return { ok: false, state: "error", error: uiText("desktopIntegrationIsUnavailable") };
  }
  if (deferred) {
    return { ok: false, state: "error", error: uiText("finishRecordingBeforeRegisteringTheGlobalShortcut") };
  }
  if (slot.invalid) {
    return { ok: false, state: "invalid", error: uiText("invalidShortcutRecordItAgain") };
  }
  if (ok) return { ok: true };
  return slot.value
    ? { ok: false, state: "occupied", error: uiText("theShortcutIsInvalidOrAlreadyUsedByAnother") }
    : { ok: false, state: "error", error: uiText("couldnTDisableTheShortcutTryAgain") };
}

async function submitSnapshot(
  request: HotkeyRequest,
  resume = false,
): Promise<RegistrationReply | null> {
  const api = getGooseDesktop();
  if (!api) return null;
  return enqueue(async () => {
    let result: RegistrationReply;
    try {
      result = await api.registerHotkeys(request);
    } catch (error) {
      if (resume && needsResume) {
        await api.resumeHotkeys();
        needsResume = false;
      }
      throw error;
    }
    if (resume && (needsResume || result.paused)) {
      result = await api.resumeHotkeys();
      needsResume = false;
    }
    return needsResume ? { ...result, paused: true } : result;
  });
}

export async function pauseDesktopGlobalHotkeys(): Promise<void> {
  const api = getGooseDesktop();
  if (!api) throw new Error(uiText("desktopIntegrationIsUnavailable"));
  await enqueue(async () => {
    needsResume = true;
    await api.pauseHotkeys();
  });
}

export async function syncAllDesktopGlobalHotkeys(
  input: DesktopGlobalHotkeyInput,
  options: { resume?: boolean } = {},
): Promise<DesktopGlobalHotkeyResults> {
  const wake = resolvedShortcut(input.wake.shortcut, input.wake.enabled);
  const quicknote = resolvedShortcut(input.quicknote.shortcut, input.quicknote.enabled);
  const search = resolvedShortcut(input.search.shortcut, input.search.enabled);
  const request = { wake: wake.value, quicknote: quicknote.value, search: search.value };
  Object.assign(current, request);

  const result = await submitSnapshot(request, options.resume);
  const deferred = result?.paused === true;
  return {
    deferred,
    wake: resultForSlot(wake, result?.wakeOk === true, !result, deferred),
    quicknote: resultForSlot(quicknote, result?.quicknoteOk === true, !result, deferred),
    search: resultForSlot(search, result?.searchOk === true, !result, deferred),
  };
}

export async function registerDesktopGlobalHotkey(
  id: DesktopGlobalHotkeyId,
  shortcut: string,
): Promise<HostHotkeyRegisterResult> {
  const slot = resolvedShortcut(shortcut, true);
  current[id] = slot.value;
  const result = await submitSnapshot({ ...current });
  const ok = id === "wake" ? result?.wakeOk : id === "quicknote" ? result?.quicknoteOk : result?.searchOk;
  return resultForSlot(
    { ...slot, invalid: slot.invalid || !shortcut.trim() },
    ok === true,
    !result,
    result?.paused,
  );
}

export async function unregisterDesktopGlobalHotkey(
  id: DesktopGlobalHotkeyId,
): Promise<void> {
  current[id] = "";
  const result = await submitSnapshot({ ...current });
  if (!result) return;
  const ok = id === "wake" ? result.wakeOk : id === "quicknote" ? result.quicknoteOk : result.searchOk;
  if (!ok) throw new Error(uiText("couldnTDisableTheShortcutTryAgain"));
}
