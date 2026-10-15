/** 检测 Electron preload 提供的原生桥接。 */
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
    throw new Error("window.gooseDesktop 不可用");
  }
  return api;
}
