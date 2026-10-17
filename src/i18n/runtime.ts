import { createInstance } from "i18next";
import { normalizeSystemLocale, resolveLocale, type LanguageBridge, type LanguageSnapshot, type LanguagePreference } from "./contract";
import type { CompiledMessages, MessageCatalog, MessageSchema, Translator } from "./types";

function bridge(): LanguageBridge | undefined {
  return typeof window === "undefined" ? undefined : window.gooseLanguage;
}

function initialSnapshot(): LanguageSnapshot {
  const desktop = bridge()?.initialSnapshot;
  if (desktop) return desktop;
  const languages = typeof navigator === "undefined" ? [] : navigator.languages;
  return {
    preference: "system", effectiveLocale: resolveLocale("system", languages),
    formatLocale: normalizeSystemLocale(languages[0]) ?? "en-US", revision: 0,
  };
}

let snapshot = initialSnapshot();
const listeners = new Set<() => void>();
export const getLanguageSnapshot = () => snapshot;
export const getLocale = () => snapshot.effectiveLocale;
export const getFormatLocale = () => snapshot.formatLocale;
export function subscribeLanguage(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function setLanguageSnapshot(next: LanguageSnapshot) {
  if (next.revision < snapshot.revision) return;
  snapshot = next;
  if (typeof document !== "undefined") document.documentElement.lang = next.effectiveLocale;
  for (const listener of listeners) listener();
}
if (typeof document !== "undefined") document.documentElement.lang = snapshot.effectiveLocale;
const desktopBridge = bridge();
desktopBridge?.onSnapshot(setLanguageSnapshot);
// A different window may save while this renderer is loading its modules.
// Subscribe first, then reconcile; revision ordering prevents a stale reply.
if (desktopBridge) void desktopBridge.getSnapshot().then(setLanguageSnapshot).catch((error) => {
  console.warn("[i18n] Could not refresh language snapshot", error);
});

/** A compile-time macro. Executing this function means a build entry omitted the plugin. */
export function i18nYaml<Id extends string = string>(
  _source: TemplateStringsArray,
): CompiledMessages<Id extends keyof MessageCatalog ? MessageCatalog[Id] : MessageSchema> {
  throw new Error("Uncompiled i18nYaml block: enable the Goose i18n build plugin for this entry.");
}

let numberFormatter: Intl.NumberFormat | undefined;
let numberFormatLocale = "";
function formatInterpolation(value: unknown): string {
  if (typeof value !== "number") return String(value ?? "");
  const locale = getFormatLocale();
  if (!numberFormatter || numberFormatLocale !== locale) {
    numberFormatter = new Intl.NumberFormat(locale);
    numberFormatLocale = locale;
  }
  return numberFormatter.format(value);
}

const engine = createInstance();
void engine.init({
  lng: getLocale(), fallbackLng: "en", supportedLngs: ["zh-Hans", "en"],
  load: "currentOnly", initAsync: false, keySeparator: false, nsSeparator: false,
  interpolation: { escapeValue: false }, returnNull: false, returnEmptyString: false,
  resources: {}, ns: [],
});
const namespaces = new WeakMap<object, string>();
let nextNamespace = 0;
function namespaceFor(messages: CompiledMessages): string {
  const existing = namespaces.get(messages);
  if (existing) return existing;
  const namespace = `messages-${++nextNamespace}`;
  engine.addResourceBundle("zh-Hans", namespace, messages["zh-Hans"]);
  engine.addResourceBundle("en", namespace, messages.en);
  namespaces.set(messages, namespace);
  return namespace;
}

export function createTranslator<Schema extends MessageSchema>(messages: CompiledMessages<Schema>): Translator<Schema> {
  const namespace = namespaceFor(messages);
  return ((key: string, parameters?: Record<string, string | number>) => {
    const options = {
      lng: getLocale(), ns: namespace,
      // Display numbers use the system region; plural selection keeps its numeric count.
      replace: parameters && Object.fromEntries(
        Object.entries(parameters).map(([name, value]) => [name, formatInterpolation(value)]),
      ),
      ...(typeof parameters?.count === "number" ? { count: parameters.count } : {}),
    };
    if (!engine.exists(key, options)) {
      console.error(`[i18n] Missing translation: ${key}`);
      return getLocale() === "zh-Hans" ? "暂不可用" : "Unavailable";
    }
    return String(engine.t(key, options));
  }) as Translator<Schema>;
}

export async function setLanguagePreference(preference: LanguagePreference): Promise<LanguageSnapshot> {
  const desktop = bridge();
  if (!desktop) throw new Error("Language preferences require the desktop application.");
  const next = await desktop.setPreference(preference);
  setLanguageSnapshot(next);
  return next;
}
export async function resetLanguagePreference(): Promise<LanguageSnapshot> {
  const desktop = bridge();
  if (!desktop) throw new Error("Language preferences require the desktop application.");
  const next = await desktop.resetPreference();
  setLanguageSnapshot(next);
  return next;
}
