import { common } from "@/i18n/common";
import { getGooseDesktop } from "@/lib/electron/runtime";
import type { LocalFolderOpenAppCandidate } from "@/lib/local-folder-open-apps";
const cached = new Map<
  string,
  { items: LocalFolderOpenAppCandidate[]; expires: number }
>();
const inFlight = new Map<string, Promise<LocalFolderOpenAppCandidate[]>>();
const signature = (items: LocalFolderOpenAppCandidate[]) =>
  JSON.stringify(items);
function cachedItems(key: string): LocalFolderOpenAppCandidate[] | null {
  const entry = cached.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expires) {
    cached.delete(key);
    return null;
  }
  return entry.items;
}
export const getCachedAvailableOpenApps = <
  T extends LocalFolderOpenAppCandidate,
>(
  items: T[],
): T[] | null => cachedItems(signature(items)) as T[] | null;
export const shell = {
  copyText: (text: string) => {
    void getGooseDesktop()?.writeText(text);
  },
  copyImage: (dataUrl: string) => {
    void getGooseDesktop()?.writeImage?.(dataUrl);
  },
  showNotification: (body: string) => {
    void getGooseDesktop()?.notify({ title: common("productName"), body });
  },
  openUrl: (url: string) => {
    void getGooseDesktop()?.openUrl(url);
  },
  openPath: async (path: string) => {
    try {
      await getGooseDesktop()?.openPath(path);
      return true;
    } catch {
      return false;
    }
  },
  showItemInFolder: async (path: string) => {
    try {
      await getGooseDesktop()?.showItemInFolder(path);
      return true;
    } catch {
      return false;
    }
  },
  openWithEditor: async (path: string, app: string) =>
    shell.openWithApp(path, app),
  openWithApp: async (path: string, app: string) =>
    Boolean(await window.gooseFs?.openWithApp?.(path, app)),
  openTerminalAtPath: async (path: string, terminal: string) =>
    Boolean(
      await window.gooseFs?.openTerminalAtPath?.(path, terminal || undefined),
    ),
  listAvailableOpenApps: async <T extends LocalFolderOpenAppCandidate>(
    items: T[],
  ): Promise<T[]> => {
    const key = signature(items);
    const existing = cachedItems(key);
    if (existing) return existing as T[];
    const pending = inFlight.get(key);
    if (pending) return pending as Promise<T[]>;

    const request = (async () => {
      try {
        const result =
          (await window.gooseFs?.listAvailableOpenApps?.(items)) ?? [];
        cached.delete(key);
        cached.set(key, {
          items: result,
          expires: Date.now() + (result.length ? 30_000 : 3_000),
        });
        while (cached.size > 32) cached.delete(cached.keys().next().value!);
        return result;
      } finally {
        inFlight.delete(key);
      }
    })();
    inFlight.set(key, request);
    return request as Promise<T[]>;
  },
};
