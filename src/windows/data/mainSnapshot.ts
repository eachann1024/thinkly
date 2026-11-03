import { useEffect, useState } from "react";
import type { AuxiliarySnapshotResponse } from "@/lib/auxiliary-window/contract";

const providers = new Map<string, () => unknown>();

export function registerMainSnapshot(key: string, read: () => unknown): () => void {
  providers.set(key, read);
  return () => {
    if (providers.get(key) === read) providers.delete(key);
  };
}

export function readRegisteredSnapshot(key: string): unknown {
  const read = providers.get(key);
  if (!read) return undefined;
  return read();
}

export function hasMainSnapshot(key: string): boolean {
  return providers.has(key);
}

export async function requestMainSnapshot<T>(key: string, attempts = 4): Promise<T | null> {
  const request = window.gooseDesktop?.auxiliary?.requestSnapshot;
  if (!request) return null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let response: AuxiliarySnapshotResponse;
    try {
      response = await request(key);
    } catch {
      response = { ok: false };
    }
    if (response.ok) return (response.value ?? null) as T;
    if (attempt + 1 < attempts) await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
  return null;
}

export function useMainSnapshot<T>(key: string): { data: T | null; ready: boolean; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [ready, setReady] = useState(false);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    void requestMainSnapshot<T>(key).then((value) => {
      if (cancelled) return;
      setData(value);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);
  return { data, ready, refresh: () => setNonce((value) => value + 1) };
}
