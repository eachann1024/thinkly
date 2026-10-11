import { isLocalFontAvailable, normalizeLocalFontName } from "@/lib/fontLoader";

export type LocalFontOption = { family: string; label: string };

type FontAccessWindow = Window & {
  queryLocalFonts?: () => Promise<Array<{ family: string }>>;
};

let availableFonts: Promise<LocalFontOption[]> | undefined;
const installedFamilies = new Set<string>();

/** Enumerate actual installed families; face styles share one menu entry. */
export function getAvailableLocalFonts(): Promise<LocalFontOption[]> {
  if (availableFonts) return availableFonts;
  const fontWindow = window as FontAccessWindow;
  if (!fontWindow.queryLocalFonts) {
    return Promise.reject(new Error("Local Font Access is unavailable"));
  }
  availableFonts = fontWindow.queryLocalFonts().then((faces) => {
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
  }).catch((error: unknown) => {
    // A denied permission can be granted later; do not cache that failure.
    availableFonts = undefined;
    throw error;
  });
  return availableFonts;
}

export async function probeLocalFont(family: string): Promise<boolean> {
  if (installedFamilies.has(family.toLocaleLowerCase())) return true;
  if (await isLocalFontAvailable(family)) return true;
  // Saved families may only expose a regular face / PostScript name to local().
  return (
    await isLocalFontAvailable(`${family} Regular`) ||
    await isLocalFontAvailable(`${family.replaceAll(" ", "")}-Regular`)
  );
}
