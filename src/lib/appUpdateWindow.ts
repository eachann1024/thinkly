import { getGooseDesktop } from "@/lib/electron/runtime";

export function openAppUpdateWindow(): void {
  const open = getGooseDesktop()?.auxiliary?.open;
  if (!open) return;
  void open({ kind: "app-update" }).catch((error: unknown) => {
    console.error("[app-update] window failed to open", error);
  });
}
