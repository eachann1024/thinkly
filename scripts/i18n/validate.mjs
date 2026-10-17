import { parseDocument, isAlias, visit } from "yaml";

const locales = ["zh-Hans", "en", "ja"];
const unsafe = new Set(["__proto__", "constructor", "prototype"]);
const plural = /_(zero|one|two|few|many|other)$/;
const parameter = /{{\s*([A-Za-z_][\w]*)(?:\s*,\s*[^{}]+)?\s*}}/g;

function fail(source, line, message) { throw new Error(`${source}:${line}: ${message}`); }
function flatten(value, prefix, result, source, line) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(source, line, "Translation maps must be mappings.");
  for (const [key, entry] of Object.entries(value)) {
    if (!key || key.split(".").some((part) => unsafe.has(part))) fail(source, line, `Unsafe translation key: ${key}`);
    const path = prefix ? `${prefix}.${key}` : key;
    if (entry && typeof entry === "object" && !Array.isArray(entry)) flatten(entry, path, result, source, line);
    else {
      if (typeof entry !== "string" || !entry.trim()) fail(source, line, `${path}: expected a non-empty string; quote numeric and boolean text.`);
      if (Object.hasOwn(result, path)) fail(source, line, `Duplicate flattened key: ${path}`);
      result[path] = entry;
    }
  }
}
function parameters(text, source, line) {
  const names = [...text.matchAll(parameter)].map((match) => match[1]);
  if (/{{|}}/.test(text.replace(parameter, ""))) fail(source, line, "Invalid interpolation; use {{name}}.");
  if (names.some((name) => unsafe.has(name))) fail(source, line, "Unsafe interpolation parameter.");
  return [...new Set(names)].sort();
}
function logicalEntries(resource, locale, source, line) {
  const entries = new Map();
  for (const [key, text] of Object.entries(resource)) {
    const branch = key.match(plural)?.[1];
    const logical = branch ? key.replace(plural, "") : key;
    let entry = entries.get(logical);
    if (!entry) { entry = { variants: [], parameters: null, plural: Boolean(branch) }; entries.set(logical, entry); }
    if (entry.plural !== Boolean(branch)) fail(source, line, `${locale}.${logical}: do not mix base and plural keys.`);
    const params = parameters(text, source, line).filter((name) => name !== "count");
    if (entry.parameters && JSON.stringify(params) !== JSON.stringify(entry.parameters)) fail(source, line, `${locale}.${logical}: plural branch parameters differ.`);
    entry.parameters = params;
    entry.count = entry.count || Boolean(branch) || parameters(text, source, line).includes("count");
    if (branch) entry.variants.push(branch);
  }
  for (const [key, entry] of entries) {
    if (!entry.plural) continue;
    const required = locale === "en" ? ["one", "other"] : ["other"];
    if (required.some((branch) => !entry.variants.includes(branch))) fail(source, line, `${locale}.${key}: missing plural branches (${required.join(", ")}).`);
    const allowed = locale === "en" ? ["zero", "one", "other"] : ["zero", "other"];
    if (entry.variants.some((branch) => !allowed.includes(branch))) fail(source, line, `${locale}.${key}: unsupported plural branch.`);
  }
  return entries;
}

export function parseMessages(text, source, startLine = 1) {
  const document = parseDocument(text, { uniqueKeys: true, strict: true, schema: "core", version: "1.2" });
  const issue = document.errors[0] ?? document.warnings[0];
  if (issue) fail(source, startLine + (issue.linePos?.[0]?.line ?? 1) - 1, issue.message);
  visit(document, (_key, node) => {
    if (isAlias(node)) fail(source, startLine, "YAML aliases are not allowed in translation resources.");
    if (node?.tag) fail(source, startLine, "Explicit YAML tags are not allowed in translation resources.");
  });
  const value = document.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join() !== [...locales].sort().join()) {
    fail(source, startLine, "Translation resources must contain exactly zh-Hans, en and ja mappings.");
  }
  const resources = {};
  const logical = {};
  for (const locale of locales) {
    resources[locale] = Object.create(null);
    flatten(value[locale], "", resources[locale], source, startLine);
    logical[locale] = logicalEntries(resources[locale], locale, source, startLine);
  }
  const english = [...logical.en.keys()].sort();
  if (!english.length) fail(source, startLine, "Empty translation resource.");
  for (const locale of locales.filter((name) => name !== "en")) {
    if (english.join("\n") === [...logical[locale].keys()].sort().join("\n")) continue;
    const difference = [...new Set([...english, ...logical[locale].keys()])].filter((key) => !logical.en.has(key) || !logical[locale].has(key));
    fail(source, startLine, `${locale}: language key coverage differs: ${difference.join(", ")}`);
  }
  const schema = {};
  for (const key of english) {
    const en = logical.en.get(key), zh = logical["zh-Hans"].get(key), ja = logical.ja.get(key);
    if (JSON.stringify(en.parameters) !== JSON.stringify(zh.parameters) || JSON.stringify(en.parameters) !== JSON.stringify(ja.parameters)) fail(source, startLine, `${key}: language interpolation parameters differ.`);
    schema[key] = Object.fromEntries(en.parameters.map((name) => [name, "string | number"]));
    if (en.count || zh.count || ja.count) schema[key].count = en.plural || zh.plural || ja.plural ? "number" : "string | number";
  }
  return { resources, schema };
}
