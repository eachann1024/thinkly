import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";

let aiHeaderActions: ReactNode = null;
let aiHeaderTitle: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setAiHeaderActions(node: ReactNode) {
  if (aiHeaderActions === node) return;
  aiHeaderActions = node;
  emit();
}

export function clearAiHeaderActions() {
  if (aiHeaderActions == null) return;
  aiHeaderActions = null;
  emit();
}

export function setAiHeaderTitle(title: string | null) {
  if (aiHeaderTitle === title) return;
  aiHeaderTitle = title;
  emit();
}

export function clearAiHeaderTitle() {
  if (aiHeaderTitle == null) return;
  aiHeaderTitle = null;
  emit();
}

export function useAiHeaderActions(): ReactNode {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    () => aiHeaderActions,
    () => null,
  );
}

export function useAiHeaderTitle(): string | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    () => aiHeaderTitle,
    () => null,
  );
}
