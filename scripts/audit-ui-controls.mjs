import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import ts from "typescript";
import { scanDirExports } from "unimport";
const root = process.cwd();
const policyPath = path.join(root, "config/ui-control-policy.json");
const policy = JSON.parse(await fs.readFile(policyPath, "utf8"));
const args = process.argv.slice(2);
const output = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
const refresh = args.includes("--refresh-baseline");
const all = [];
async function walk(dir) {
  for (const entry of await fs.readdir(path.join(root, dir), { withFileTypes: true })) {
    const name = `${dir}/${entry.name}`;
    if (entry.isDirectory()) { if (!policy.excludeDirectories.includes(entry.name)) await walk(name); }
    else if (/\.(tsx?|css)$/.test(name) && !/\.d\.ts$/.test(name)) all.push(name);
  }
}
for (const dir of policy.sourceRoots) await walk(dir);
const entrySource = ts.createSourceFile("entries.ts", await fs.readFile(path.join(root, "config/vite/autoImportEntries.ts"), "utf8"), ts.ScriptTarget.Latest, true);
const entries = [];
function collectEntries(node) { if (ts.isStringLiteral(node) && node.text.startsWith("src/")) entries.push(node.text); ts.forEachChild(node, collectEntries); }
collectEntries(entrySource);
const automatic = await scanDirExports(entries, { cwd: root });
const autoMap = new Map();
for (const item of automatic.filter(item => !item.type)) {
  const from = path.isAbsolute(item.from) ? path.relative(root, item.from) : item.from;
  const name = item.as || item.name;
  autoMap.set(name, [...(autoMap.get(name) || []), from]);
}
const findings = [];
const controls = [];
const categories = { native: /\b(?:dialog\.showOpenDialog|dialog\.showSaveDialog|Menu\.buildFromTemplate|nativeTheme)\b/g,
  "raw-color": /#[\da-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(\s*[-+\d.][\d.%\s,+/deg-]*\)/g,
  "local-dark": /(?:\bdark:|\.dark\b|prefers-color-scheme)/g,
  important: /!important\b/g,
  "token-redefinition": /--goose-interactive[\w-]*\s*:/g };
function allowed(category, file) { return (policy.allowedOwners[category] || []).some(prefix => file === prefix || (prefix.endsWith("/") && file.startsWith(prefix))); }
function add(category, file, source, start, text) {
  const line = source.slice(0, start).split("\n").length;
  const normalized = text.trim().replace(/\s+/g, " ");
  const id = crypto.createHash("sha256").update(`${category}\0${file}\0${normalized}`).digest("hex").slice(0, 16);
  const exception = policy.exceptions.find(item => item.file === file && item.categories.includes(category));
  const baseline = policy.baseline.find(item => item.id === id && item.file === file && item.category === category &&
    ["content", "native", "layout"].includes(item.classification) && item.reason?.trim());
  findings.push({ id, category, file, line, text: normalized, status: allowed(category, file) ? "adapter" : exception ? "exception" : baseline ? "pending" : "new", classification: exception?.classification || baseline?.classification || (allowed(category, file) ? "public-adapter" : "unreviewed"), reason: exception?.reason || baseline?.reason });
}
for (const file of all.sort()) {
  const source = await fs.readFile(path.join(root, file), "utf8");
  if (!file.endsWith(".css")) {
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const imports = new Map(); const locals = new Set();
    function bindings(node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const vendor = policy.vendorPackages.some(prefix => node.moduleSpecifier.text.startsWith(prefix));
        const clause = node.importClause;
        if (clause?.name) imports.set(clause.name.text, node.moduleSpecifier.text);
        if (clause?.namedBindings) {
          if (ts.isNamespaceImport(clause.namedBindings)) imports.set(clause.namedBindings.name.text, node.moduleSpecifier.text);
          else for (const item of clause.namedBindings.elements) imports.set(item.name.text, node.moduleSpecifier.text);
        }
        if (vendor) add("vendor", file, source, node.getStart(tree), node.getText(tree));
      }
      if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isVariableDeclaration(node) || ts.isParameter(node)) && node.name && ts.isIdentifier(node.name)) locals.add(node.name.text);
      ts.forEachChild(node, bindings);
    }
    bindings(tree);
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(tree); const head = tag.split(".")[0];
        if (policy.rawElements.includes(tag)) add("raw", file, source, node.getStart(tree), node.getText(tree));
        if (/^[A-Z]/.test(tag)) {
          const providers = imports.has(head) ? [imports.get(head)] : locals.has(head) ? ["local-binding"] : autoMap.get(head) || ["unresolved"];
          controls.push({ file, line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1, tag, providers });
          if (providers.length > 1) add("auto-import-ambiguity", file, source, node.getStart(tree), tag);
        }
      }
      if (ts.isCallExpression(node) && /\.createElement$/.test(node.expression.getText(tree)) && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && policy.rawElements.includes(node.arguments[0].text)) add("imperative", file, source, node.getStart(tree), node.getText(tree));
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  for (const [category, pattern] of Object.entries(categories)) for (const match of source.matchAll(pattern)) add(category, file, source, match.index, match[0]);
}
if (refresh) {
  const present = new Set(findings.map(item => item.id));
  policy.baseline = policy.baseline.filter(item => present.has(item.id) &&
    ["content", "native", "layout"].includes(item.classification) && item.reason?.trim());
  await fs.writeFile(policyPath, JSON.stringify(policy, null, 2) + "\n");
}
const report = { generatedAt: new Date().toISOString(), sourceFiles: all.length, summary: Object.fromEntries(["adapter", "exception", "pending", "new"].map(status => [status, findings.filter(item => item.status === status).length])), findings, controls };
if (output) await fs.writeFile(path.resolve(root, output), JSON.stringify(report, null, 2) + "\n");
const summary = { generatedAt: report.generatedAt, sourceFiles: report.sourceFiles, summary: report.summary,
  controls: controls.length, output: output ? path.resolve(root, output) : undefined,
  remainingControls: findings.filter(item => ["raw", "imperative", "vendor", "auto-import-ambiguity"].includes(item.category) && item.status === "new").length,
  baselinePolicy: "refresh仅清理已有人工分类基线；新增条目必须手填id/classification/reason" };
console.log(JSON.stringify(output ? summary : { ...summary, newCandidates: findings.filter(item => item.status === "new") }, null, 2));
