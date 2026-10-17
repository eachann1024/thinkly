import ts from "typescript";
import MagicString from "magic-string";
import { resolve, dirname } from "node:path";
import { parseMessages } from "./validate.mjs";

function isI18nImport(name, filename) {
  if (/^@\/i18n(?:\/(?:core|index|runtime))?$/.test(name)) return true;
  if (!name.startsWith(".")) return false;
  const target = resolve(dirname(filename), name).replaceAll("\\", "/");
  return /\/src\/i18n(?:\/(?:core|index|runtime)(?:\.ts)?)?$/.test(target);
}

export function extractBlocks(code, filename) {
  // TypeScript requests forward-slash paths even when esbuild supplies Windows paths.
  filename = filename.replaceAll("\\", "/");
  const file = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true, filename.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const host = ts.createCompilerHost({ noLib: true, noResolve: true });
  const canonicalFilename = host.getCanonicalFileName(filename);
  host.getSourceFile = (name) => host.getCanonicalFileName(name.replaceAll("\\", "/")) === canonicalFilename ? file : undefined;
  const program = ts.createProgram([filename], { noLib: true, noResolve: true }, host);
  const checker = program.getTypeChecker();
  const bindings = new Set();
  for (const node of file.statements) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier) || !isI18nImport(node.moduleSpecifier.text, filename)) continue;
    const named = node.importClause?.namedBindings;
    if (!named || !ts.isNamedImports(named)) continue;
    for (const element of named.elements) {
      if ((element.propertyName?.text ?? element.name.text) === "i18nYaml") bindings.add(checker.getSymbolAtLocation(element.name));
    }
  }
  const blocks = [];
  function walk(node) {
    if (ts.isTaggedTemplateExpression(node)) {
      const matched = ts.isIdentifier(node.tag) && bindings.has(checker.getSymbolAtLocation(node.tag));
      if (matched) {
        const line = file.getLineAndCharacterOfPosition(node.template.getStart(file)).line + 1;
        if (!ts.isNoSubstitutionTemplateLiteral(node.template)) throw new Error(`${filename}:${line}: i18nYaml must be static; use {{name}} instead of JavaScript interpolation.`);
        const name = ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name) ? node.parent.name.text : `block${blocks.length + 1}`;
        const parsed = parseMessages(node.template.text, filename, line);
        blocks.push({ ...parsed, node, start: node.getStart(file), end: node.end, line, name, source: filename });
      } else if (ts.isIdentifier(node.tag) && node.tag.text === "i18nYaml") {
        throw new Error(`${filename}: i18nYaml must refer to the named import from the Goose i18n module.`);
      }
    }
    if (ts.isIdentifier(node) && bindings.has(checker.getSymbolAtLocation(node)) &&
        !ts.isImportSpecifier(node.parent) && !(ts.isTaggedTemplateExpression(node.parent) && node.parent.tag === node)) {
      const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
      throw new Error(`${filename}:${line}: i18nYaml may only be used directly as a static template tag.`);
    }
    ts.forEachChild(node, walk);
  }
  walk(file);
  return { file, blocks };
}

export function transformMessages(code, filename) {
  if (/\.ya?ml$/.test(filename)) {
    const parsed = parseMessages(code, filename);
    const output = new MagicString(code);
    output.overwrite(0, code.length, `export default ${JSON.stringify(parsed.resources)};`);
    return { code: output.toString(), map: output.generateMap({ source: filename, includeContent: true, hires: true }), blocks: [{ ...parsed, source: filename, line: 1, name: "default" }] };
  }
  if (!code.includes("i18n")) return null;
  const { blocks } = extractBlocks(code, filename);
  if (!blocks.length) return null;
  const output = new MagicString(code);
  for (const block of blocks) output.overwrite(block.start, block.end, JSON.stringify(block.resources));
  return { code: output.toString(), map: output.generateMap({ source: filename, includeContent: true, hires: true }), blocks };
}
