import { OPEN_AI_PANEL_EVENT } from "@/components/editor/ai/composer/selectionQuoteData";
import type { ComposerSlashBuiltinId } from "@/lib/notebook-ai/composerSlashCommands";

export const AI_SLASH_COMMAND_EVENT = "goose-note:ai-slash-command";

let pending: ComposerSlashBuiltinId | null = null;

/** 打开 AI 面板并执行 /新会话 或 /压缩。面板还没挂上时先记下，挂上后取走。 */
export function requestAiSlashCommand(id: ComposerSlashBuiltinId): void {
  pending = id;
  window.dispatchEvent(new CustomEvent(OPEN_AI_PANEL_EVENT));
  if (!pending) return;
  window.dispatchEvent(new CustomEvent(AI_SLASH_COMMAND_EVENT));
}

export function cancelPendingAiSlashCommand(): void {
  pending = null;
}

export function takePendingAiSlashCommand(): ComposerSlashBuiltinId | null {
  const id = pending;
  pending = null;
  return id;
}
