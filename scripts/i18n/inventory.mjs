import ts from "typescript";

/** Candidates require source review: content, stable identifiers and logs are not UI copy. */
export function inventoryHan(code, file) {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const candidates = [];
  const visit = (node) => {
    if (ts.isTaggedTemplateExpression(node) && /i18nYaml/.test(node.tag.getText(source))) return;
    if ((ts.isStringLiteralLike(node) || ts.isJsxText(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) && /[\u3400-\u9fff]/.test(node.text)) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      const parent = node.parent;
      candidates.push({ file, line, kind: ts.SyntaxKind[parent?.kind ?? node.kind], text: node.text, context: parent?.getText(source).slice(0, 700) });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return candidates;
}
