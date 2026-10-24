import { useCallback, useSyncExternalStore } from "react";

type MenuState = { owners: Set<object>; listeners: Set<() => void> };
const editors = new WeakMap<object, MenuState>();

function getState(editor: object) {
  let state = editors.get(editor);
  if (!state) {
    state = { owners: new Set(), listeners: new Set() };
    editors.set(editor, state);
  }
  return state;
}

export function setBlockHandleMenuOpen(editor: object, owner: object, open: boolean) {
  const state = getState(editor);
  const wasOpen = state.owners.size > 0;
  if (open) state.owners.add(owner);
  else state.owners.delete(owner);
  if (wasOpen !== (state.owners.size > 0)) {
    state.listeners.forEach((listener) => listener());
  }
}

export function useBlockHandleMenuOpen(editor: object) {
  const subscribe = useCallback((listener: () => void) => {
    const state = getState(editor);
    state.listeners.add(listener);
    return () => { state.listeners.delete(listener); };
  }, [editor]);
  const getSnapshot = useCallback(() => getState(editor).owners.size > 0, [editor]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
