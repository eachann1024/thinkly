import type { PersistStorage } from "zustand/middleware";
import { useNotebooks } from "@/stores/useNotebooks";
import { useSettings } from "@/stores/useSettings";

type PersistApi<S> = {
  getOptions: () => { storage?: PersistStorage<S> };
  setOptions: (options: { storage: PersistStorage<S> }) => void;
  rehydrate: () => Promise<void> | void;
};

function makeReadOnly<S>(persist: PersistApi<S>): void {
  const storage = persist.getOptions().storage;
  if (!storage) return;
  persist.setOptions({
    storage: {
      getItem: (name) => storage.getItem(name),
      setItem: () => {},
      removeItem: () => {},
    },
  });
}

export function installReadOnlyPersistence(): void {
  makeReadOnly(useSettings.persist as unknown as PersistApi<unknown>);
  makeReadOnly(useNotebooks.persist as unknown as PersistApi<unknown>);
}

export async function refreshReadOnlyPersistence(): Promise<void> {
  await Promise.all([
    useSettings.persist.rehydrate(),
    useNotebooks.persist.rehydrate(),
  ]);
}
