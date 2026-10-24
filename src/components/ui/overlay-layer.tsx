import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import { overlayLayer, UI_LAYERS, type OverlayKind } from "@/lib/uiLayers";

const OverlayLayerContext = createContext(0);
const MODAL_LAYER_STEP = 1000;

type ModalEntry = { id: string; owner: number; base: number };
const emptyModalStack: readonly ModalEntry[] = [];
let modalStack: readonly ModalEntry[] = emptyModalStack;
const modalListeners = new Set<() => void>();

function subscribeToModals(listener: () => void) {
  modalListeners.add(listener);
  return () => {
    modalListeners.delete(listener);
  };
}

function getModalStack() {
  return modalStack;
}

function getServerModalStack() {
  return emptyModalStack;
}

function publishModalStack(next: readonly ModalEntry[]) {
  modalStack = next;
  modalListeners.forEach((listener) => listener());
}

function registerModal(id: string, owner: number) {
  const index = modalStack.findIndex((entry) => entry.id === id);
  if (index < 0) {
    publishModalStack([...modalStack, { id, owner, base: nextModalBase(modalStack) }]);
  } else if (modalStack[index].owner !== owner) {
    publishModalStack(modalStack.map((entry) => entry.id === id ? { ...entry, owner } : entry));
  }
}

function unregisterModal(id: string) {
  if (modalStack.some((entry) => entry.id === id)) {
    publishModalStack(modalStack.filter((entry) => entry.id !== id));
  }
}

function resolvedModalLayer(entry: ModalEntry) {
  return Math.max(entry.base, entry.owner + MODAL_LAYER_STEP);
}

function nextModalBase(stack: readonly ModalEntry[]) {
  return stack.reduce<number>((base, entry) => Math.max(base, resolvedModalLayer(entry) + MODAL_LAYER_STEP), UI_LAYERS.modal);
}

export function OverlayLayerProvider({ layer, children }: PropsWithChildren<{ layer: number }>) {
  return <OverlayLayerContext.Provider value={layer}>{children}</OverlayLayerContext.Provider>;
}

export function useOverlayLayer(kind: OverlayKind): number {
  return overlayLayer(kind, useContext(OverlayLayerContext));
}

export function useModalLayer(open: boolean): number {
  const id = useId();
  const owner = useContext(OverlayLayerContext);
  const stack = useSyncExternalStore(subscribeToModals, getModalStack, getServerModalStack);

  useLayoutEffect(() => {
    if (open) registerModal(id, owner);
  }, [id, open, owner]);

  useLayoutEffect(() => {
    if (open) return () => unregisterModal(id);
  }, [id, open]);

  const entry = stack.find((entry) => entry.id === id);
  const base = entry?.base ?? (open ? nextModalBase(stack) : UI_LAYERS.modal);
  return Math.max(base, owner + MODAL_LAYER_STEP);
}

export function useOverlayTopLayer(layer: number): boolean {
  const stack = useSyncExternalStore(subscribeToModals, getModalStack, getServerModalStack);
  const top = stack.reduce((highest, entry) => Math.max(highest, resolvedModalLayer(entry)), 0);
  return top >= UI_LAYERS.modal && layer >= top && layer < top + MODAL_LAYER_STEP;
}
