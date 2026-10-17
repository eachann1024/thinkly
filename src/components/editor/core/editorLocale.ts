import { en, zh } from "@blocknote/core/locales";
import { getLocale, i18nYaml, createTranslator } from "@/i18n";

const messages = i18nYaml<"src/components/editor/core/editorLocale.ts#messages:1">`
zh-Hans:
  typeToInsertABlock: "输入 / 选择内容"
  quote: "引用"
en:
  typeToInsertABlock: "Type / to insert a block"
  quote: "Quote"
`;
const t = createTranslator(messages);
export type EditorPlaceholderProfile = "note" | "quicknote" | "history";

export function getEditorPlaceholders(profile: EditorPlaceholderProfile) {
  const dictionary = getLocale() === "zh-Hans" ? zh : en;
  if (profile === "history") return dictionary.placeholders;
  return {
    ...dictionary.placeholders,
    default: profile === "quicknote" ? "" : t("typeToInsertABlock"),
    quote: t("quote"),
    toggleListItem: "",
  };
}

/** BlockNote retains this object for its lifetime; translate leaf reads on demand. */
export function createLiveEditorDictionary(profile: EditorPlaceholderProfile) {
  const at = (path: string[]) => {
    let value: any = getLocale() === "zh-Hans" ? zh : en;
    for (const part of path) value = value[part];
    return value;
  };
  const live = (source: Record<string, any>, path: string[] = []): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(source)) {
      const nextPath = [...path, key];
      if (value && typeof value === "object" && !Array.isArray(value)) result[key] = live(value, nextPath);
      else Object.defineProperty(result, key, {
        enumerable: true, configurable: true, get: () => at(nextPath),
      });
    }
    return result;
  };
  const dictionary = live(en);
  for (const key of Object.keys(getEditorPlaceholders(profile))) {
    Object.defineProperty(dictionary.placeholders, key, {
      enumerable: true, configurable: true,
      get: () => getEditorPlaceholders(profile)[key as keyof typeof en.placeholders],
    });
  }
  return dictionary as typeof en;
}
