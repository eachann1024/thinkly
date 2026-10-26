import { LANGUAGE_ALIASES } from "./codeLanguageAliases";

export function findLanguageOptionIndex(
  languages: readonly string[],
  currentLanguage: string,
): number {
  const current = currentLanguage.trim().toLowerCase() || "text";
  const exact = languages.findIndex((lang) => lang.toLowerCase() === current);
  if (exact >= 0) return exact;
  const canonical = LANGUAGE_ALIASES[current] || current;
  return languages.findIndex(
    (lang) => (LANGUAGE_ALIASES[lang] || lang) === canonical,
  );
}

export function defaultLanguageHighlightIndex(
  languages: readonly string[],
  search: string,
  currentLanguage: string,
): number {
  if (languages.length === 0) return 0;
  if (search.trim()) return 0;
  const index = findLanguageOptionIndex(languages, currentLanguage);
  return index >= 0 ? index : 0;
}

export function moveLanguageHighlightIndex(
  current: number,
  count: number,
  delta: number,
): number {
  if (count <= 0) return 0;
  const clamped = Math.min(Math.max(current, 0), count - 1);
  return (clamped + delta + count) % count;
}
