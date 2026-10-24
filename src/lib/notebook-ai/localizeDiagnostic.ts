import messages from "./diagnosticMessages.yaml";
import { createTranslator, getLocale } from "@/i18n";

const t = createTranslator(messages);
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const legacySources: Readonly<Record<string, string>> = {
  theNewPageSParentIsMissingIn: "新页面的父级不存在、已在垃圾箱中或不属于当前笔记本",
  theDeletionTargetIsMissingInTrashOr: "删除目标不存在、已在垃圾箱中或不属于当前笔记本",
  pageInTrashHasChangedAndWasNot: "垃圾箱页面 {{value1}} 已变化，未恢复",
};
const diagnostics = Object.entries(messages["zh-Hans"]).map(([key, source]) => {
  source = legacySources[key] ?? source;
  const parameters: string[] = [];
  let pattern = "";
  let cursor = 0;
  for (const match of source.matchAll(/\{\{(\w+)\}\}/g)) {
    pattern += escapeRegExp(source.slice(cursor, match.index)) + "([\\s\\S]*?)";
    parameters.push(match[1]);
    cursor = match.index! + match[0].length;
  }
  pattern += escapeRegExp(source.slice(cursor));
  return { key, parameters, pattern: new RegExp(`^${pattern}$`) };
});

export function localizeNotebookAiDiagnostic(message: string): string {
  if (!message) return message;
  for (const diagnostic of diagnostics) {
    const match = diagnostic.pattern.exec(message);
    if (!match) continue;
    const parameters = Object.fromEntries(
      diagnostic.parameters.map((name, index) => [name, match[index + 1]]),
    );
    return (t as (key: string, values: Record<string, string>) => string)(diagnostic.key, parameters);
  }
  if (/^\d+\. /m.test(message)) {
    return message.split("\n").map((line) => {
      const numbered = /^(\d+\. )(.*)$/.exec(line);
      return numbered ? numbered[1] + localizeNotebookAiDiagnostic(numbered[2]) : line;
    }).join("\n");
  }
  if (message.includes("；")) {
    return message.split("；").map(localizeNotebookAiDiagnostic).join(getLocale() === "zh-Hans" ? "；" : "; ");
  }
  return message;
}
