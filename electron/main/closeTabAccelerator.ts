
export const CLOSE_ACTIVE_TAB_CHANNEL = "desktop:close-active-tab";
export const CLOSE_TAB_ACCELERATOR = "CommandOrControl+W";
export const CLOSE_WINDOW_ACCELERATOR = "CommandOrControl+Shift+W";

export type CloseTabKeyInput = {
  type?: string;
  key?: string;
  code?: string;
  meta?: boolean;
  control?: boolean;
  alt?: boolean;
  shift?: boolean;
};

export function isPrimaryModW(
  input: CloseTabKeyInput,
  platform: NodeJS.Platform = process.platform,
): boolean {
  if (input.type && input.type !== "keyDown") return false;
  if (input.alt || input.shift) return false;
  const isW =
    (input.key ?? "").toLowerCase() === "w" || input.code === "KeyW";
  if (!isW) return false;
  if (platform === "darwin") return Boolean(input.meta) && !input.control;
  return Boolean(input.control) && !input.meta;
}
