import { isLocalFontAvailable, normalizeLocalFontName } from "@/lib/fontLoader";

export type LocalFontOption = { family: string; label: string };

type FontAccessWindow = Window & {
  queryLocalFonts?: () => Promise<Array<{ family: string }>>;
};

let availableFonts: Promise<LocalFontOption[]> | undefined;
let fontsExpireAt = 0;
let fontsLoading = false;
const FONT_TTL = 60_000;
const probes = new Map<string, { value: boolean; expires: number }>();
const pendingProbes = new Map<string, Promise<boolean>>();
const installedFamilies = new Set<string>();

export function getAvailableLocalFonts(): Promise<LocalFontOption[]> {
  if (availableFonts && (fontsLoading || Date.now() < fontsExpireAt))
    return availableFonts;
  const fontWindow = window as FontAccessWindow;
  if (!fontWindow.queryLocalFonts) {
    return Promise.reject(new Error("Local Font Access is unavailable"));
  }
  fontsLoading = true;
  availableFonts = fontWindow
    .queryLocalFonts()
    .then((faces) => {
      installedFamilies.clear();
      probes.clear();
      fontsExpireAt = Date.now() + FONT_TTL;
      const families = new Map<string, string>();
      for (const face of faces) {
        const family = normalizeLocalFontName(face.family);
        if (!family || family.startsWith(".")) continue;
        const key = family.toLocaleLowerCase();
        families.set(key, family);
        installedFamilies.add(key);
      }
      return [...families.values()]
        .sort(new Intl.Collator("zh-CN", { numeric: true }).compare)
        .map((family) => ({ family, label: family }));
    })
    .catch((error: unknown) => {
      availableFonts = undefined;
      throw error;
    })
    .finally(() => {
      fontsLoading = false;
    });
  return availableFonts;
}

export function probeLocalFont(family: string): Promise<boolean> {
  const normalized = normalizeLocalFontName(family);
  if (!normalized) return Promise.resolve(false);
  const key = normalized.toLocaleLowerCase();
  if (Date.now() < fontsExpireAt && installedFamilies.has(key))
    return Promise.resolve(true);
  const cached = probes.get(key);
  if (cached && Date.now() < cached.expires)
    return Promise.resolve(cached.value);
  const pending = pendingProbes.get(key);
  if (pending) return pending;
  const request = (async () => {
    const value =
      (await isLocalFontAvailable(normalized)) ||
      (await isLocalFontAvailable(`${normalized} Regular`)) ||
      (await isLocalFontAvailable(`${normalized.replaceAll(" ", "")}-Regular`));
    probes.delete(key);
    probes.set(key, {
      value,
      expires: Date.now() + (value ? FONT_TTL : 5_000),
    });
    while (probes.size > 256) probes.delete(probes.keys().next().value!);
    return value;
  })().finally(() => {
    pendingProbes.delete(key);
  });
  pendingProbes.set(key, request);
  return request;
}
