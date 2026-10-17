export type LanguagePreference = "system" | "zh-Hans" | "en" | "ja";
export type AppLocale = "zh-Hans" | "en" | "ja";
export type LanguageSnapshot = {
  preference: LanguagePreference;
  effectiveLocale: AppLocale;
  formatLocale: string;
  revision: number;
  error?: string;
};

export function normalizePreference(value: unknown): LanguagePreference {
  return value === "zh-Hans" || value === "en" || value === "ja" ? value : "system";
}

export function normalizeSystemLocale(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const tag = value.trim().replace(/[.@].*$/, "").replaceAll("_", "-");
  if (!tag || /^(C|POSIX)$/i.test(tag)) return undefined;
  try { return new Intl.Locale(tag).toString(); } catch { return undefined; }
}

function matchLocale(value: unknown): AppLocale | undefined {
  const tag = normalizeSystemLocale(value);
  if (!tag) return undefined;
  const locale = new Intl.Locale(tag);
  if (locale.language === "en") return "en";
  if (locale.language === "ja") return "ja";
  if (locale.language !== "zh") return undefined;
  if (locale.script === "Hans") return "zh-Hans";
  if (locale.script) return undefined;
  if (!locale.region || ["CN", "SG"].includes(locale.region)) return "zh-Hans";
  return undefined;
}

export function resolveLocale(preference: unknown, languages: readonly unknown[]): AppLocale {
  const normalized = normalizePreference(preference);
  if (normalized !== "system") return normalized;
  for (const language of languages) {
    const match = matchLocale(language);
    if (match) return match;
  }
  return "en";
}

export type LanguageBridge = {
  readonly initialSnapshot: LanguageSnapshot;
  getSnapshot: () => Promise<LanguageSnapshot>;
  setPreference: (preference: LanguagePreference) => Promise<LanguageSnapshot>;
  resetPreference: () => Promise<LanguageSnapshot>;
  onSnapshot: (listener: (snapshot: LanguageSnapshot) => void) => () => void;
};
