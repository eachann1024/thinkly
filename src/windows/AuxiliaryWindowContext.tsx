import { createContext, useContext, type ReactNode } from "react";
import type {
  AuxiliaryAISetupConfig,
  AuxiliarySettingsSection,
  AuxiliaryWindowState,
} from "@/lib/auxiliary-window/contract";

const AuxiliaryWindowContext = createContext<AuxiliaryWindowState | null>(null);

export function AuxiliaryWindowProvider({
  value,
  children,
}: {
  value: AuxiliaryWindowState;
  children: ReactNode;
}) {
  return <AuxiliaryWindowContext.Provider value={value}>{children}</AuxiliaryWindowContext.Provider>;
}

export function useAuxiliaryWindow(): AuxiliaryWindowState {
  const value = useContext(AuxiliaryWindowContext);
  if (!value) throw new Error("useAuxiliaryWindow");
  return value;
}

export function completeAuxiliary(
  status: "confirmed" | "cancelled",
  values?: unknown,
): Promise<void> {
  return window.gooseDesktop?.auxiliary?.complete({ status, values }) ?? Promise.resolve();
}

export function closeAuxiliary(): Promise<void> {
  return window.gooseDesktop?.auxiliary?.close() ?? Promise.resolve();
}

export function openPageInMain(pageId: string): Promise<boolean> {
  const open = window.gooseDesktop?.auxiliary?.openPage;
  return open ? open(pageId) : Promise.resolve(false);
}

export function openSettingsInMain(section: AuxiliarySettingsSection): Promise<boolean> {
  const open = window.gooseDesktop?.auxiliary?.openSettings;
  return open ? open(section) : Promise.resolve(false);
}

export function applyAISetupInMain(config: AuxiliaryAISetupConfig): Promise<boolean> {
  const apply = window.gooseDesktop?.auxiliary?.applyAISetup;
  return apply ? apply(config) : Promise.resolve(false);
}
