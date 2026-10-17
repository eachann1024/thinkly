import { getLocale, type CompiledMessages } from "../i18n/core";
import gitErrors from "../../electron/main/i18n/gitErrors.yaml";
import gitSyncMessages from "../../electron/main/i18n/gitSyncMessages.yaml";
import nativeServices from "../../electron/main/i18n/nativeServices.yaml";
import { gitMessages } from "./git-messages";
import { historyMessages } from "./history/messages";

const catalogs: CompiledMessages[] = [gitErrors, gitSyncMessages, nativeServices, gitMessages, historyMessages];
const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = catalogs.flatMap((catalog) => (["zh-Hans", "en", "ja"] as const).flatMap((locale) =>
  Object.entries(catalog[locale]).map(([key, source]) => {
    const names: string[] = [];
    let cursor = 0;
    let expression = "^";
    for (const match of source.matchAll(/\{\{(\w+)\}\}/g)) {
      expression += escapePattern(source.slice(cursor, match.index)) + "([\\s\\S]*?)";
      names.push(match[1]!);
      cursor = match.index! + match[0].length;
    }
    expression += escapePattern(source.slice(cursor)) + "$";
    return { catalog, key, source, names, pattern: names.length ? new RegExp(expression) : null };
  }),
));

/** Translate the current status view without rewriting stored diagnostics. */
export function localizeSavedGitError(message: string, depth = 0): string {
  for (const entry of patterns) {
    const match = entry.pattern?.exec(message);
    if (entry.pattern ? !match : entry.source !== message) continue;
    const values = Object.fromEntries(entry.names.map((name, index) => [name, match![index + 1] ?? ""]));
    const target = entry.catalog[getLocale()][entry.key] ?? message;
    return target.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
      const value = values[name] ?? "";
      return name === "reason" && depth < 3 ? localizeSavedGitError(value.trim(), depth + 1) : value;
    });
  }
  return message;
}
