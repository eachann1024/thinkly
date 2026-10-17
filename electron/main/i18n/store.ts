import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { normalizeSystemLocale, resolveLocale, type LanguagePreference, type LanguageSnapshot } from "../../../src/i18n/contract";

let snapshot: LanguageSnapshot;
let source: string | null = null;
let readError = false;
let writes: Promise<unknown> = Promise.resolve();
const preferencePath = () => path.join(app.getPath("userData"), "language-preference.json");

async function readSource(): Promise<string | null> {
  try { return await fs.readFile(preferencePath(), "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function initializeLanguage(): Promise<void> {
  let preference: LanguagePreference = "system";
  let error: string | undefined;
  try {
    source = await readSource();
    if (source !== null) {
      const saved = JSON.parse(source);
      if (saved?.version !== 1 || !["system", "zh-Hans", "en"].includes(saved?.preference)) {
        throw new Error("Invalid language preference");
      }
      preference = saved.preference;
    }
  } catch {
    readError = true;
    error = "language.readFailed";
  }
  let languages: string[] = [];
  let region = "en-US";
  try { languages = app.getPreferredSystemLanguages(); } catch { /* Unsupported OS locale: English fallback. */ }
  try { region = normalizeSystemLocale(app.getSystemLocale()) ?? region; } catch { /* Keep a valid Intl locale. */ }
  snapshot = { preference, effectiveLocale: resolveLocale(preference, languages), formatLocale: region, revision: 0, ...(error ? { error } : {}) };
}

export function getLanguageSnapshot(): LanguageSnapshot {
  if (!snapshot) throw new Error("Language is not initialized");
  return { ...snapshot };
}

export function saveLanguagePreference(preference: unknown): Promise<LanguageSnapshot> {
  if (preference !== "system" && preference !== "zh-Hans" && preference !== "en") {
    return Promise.reject(new Error("language.invalidPreference"));
  }
  const operation = writes.then(async () => {
    // A damaged or unreadable source is never replaced with defaults.
    if (readError) throw new Error("language.readFailed");
    if (await readSource() !== source) throw new Error("language.conflict");
    if (snapshot.preference === preference && !snapshot.error) return getLanguageSnapshot();
    const nextSource = `${JSON.stringify({ version: 1, preference })}\n`;
    const target = preferencePath();
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await fs.mkdir(path.dirname(target), { recursive: true });
      const handle = await fs.open(temporary, "wx", 0o600);
      try { await handle.writeFile(nextSource, "utf8"); await handle.sync(); }
      finally { await handle.close(); }
      if (await readSource() !== source) throw new Error("language.conflict");
      await fs.rename(temporary, target);
      source = nextSource;
      snapshot = { ...snapshot, preference, revision: snapshot.revision + 1 };
      delete snapshot.error;
      return getLanguageSnapshot();
    } catch (error) {
      if (error instanceof Error && error.message === "language.conflict") throw error;
      throw new Error("language.saveFailed");
    } finally {
      await fs.rm(temporary, { force: true }).catch(() => {});
    }
  });
  writes = operation.catch(() => {});
  return operation;
}
