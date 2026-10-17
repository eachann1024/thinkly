import { EditorAction } from "@/components/editor/ui/button";
import { useState } from "react";
import * as GooseIcons from "@/components/ui/icons";
import { Button } from "@/components/editor/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/code/CodeLatexHints.tsx#messages:1">`
zh-Hans:
  fraction: "分数"
  superscript: "上标"
  subscript: "下标"
  squareRoot: "根号"
  sum: "求和"
  integral: "积分"
  limit: "极限"
  infinity: "无穷大"
  notEqual: "不等于"
  lessThanOrEqualTo: "小于等于"
  greaterThanOrEqualTo: "大于等于"
  arrow: "箭头"
  vector: "向量"
  matrix: "矩阵"
  nthRoot: "n次根"
  latexSyntaxReference: "LaTeX 语法参考"
en:
  fraction: "Fraction"
  superscript: "Superscript"
  subscript: "Subscript"
  squareRoot: "Square root"
  sum: "Sum"
  integral: "Integral"
  limit: "Limit"
  infinity: "Infinity"
  notEqual: "Not equal"
  lessThanOrEqualTo: "Less than or equal to"
  greaterThanOrEqualTo: "Greater than or equal to"
  arrow: "Arrow"
  vector: "Vector"
  matrix: "Matrix"
  nthRoot: "Nth root"
  latexSyntaxReference: "LaTeX syntax reference"
`;
const t = createTranslator(messages);


const LATEX_SNIPPETS = [
  { get label() { return t("fraction"); }, code: "\\frac{a}{b}" },
  { get label() { return t("superscript"); }, code: "x^{n}" },
  { get label() { return t("subscript"); }, code: "x_{n}" },
  { get label() { return t("squareRoot"); }, code: "\\sqrt{x}" },
  { get label() { return t("sum"); }, code: "\\sum_{i=1}^{n}" },
  { get label() { return t("integral"); }, code: "\\int_{a}^{b}" },
  { get label() { return t("limit"); }, code: "\\lim_{x \\to a}" },
  { get label() { return t("infinity"); }, code: "\\infty" },
  { get label() { return t("notEqual"); }, code: "\\neq" },
  { get label() { return t("lessThanOrEqualTo"); }, code: "\\leq" },
  { get label() { return t("greaterThanOrEqualTo"); }, code: "\\geq" },
  { get label() { return t("arrow"); }, code: "\\rightarrow" },
  { get label() { return t("vector"); }, code: "\\vec{a}" },
  { label: "α", code: "\\alpha" },
  { label: "β", code: "\\beta" },
  { label: "π", code: "\\pi" },
  { get label() { return t("matrix"); }, code: "\\begin{matrix} a & b \\\\ c & d \\end{matrix}" },
  { get label() { return t("nthRoot"); }, code: "\\sqrt[n]{x}" },
];

export function CodeLatexHints({
  collapsed,
  language,
  isEditable,
}: {
  collapsed: boolean;
  language: string;
  isEditable: boolean;
}) {
  useLocale();
  const [showLatexHint, setShowLatexHint] = useState(false);
  return (
    <>
      {/* LaTeX hint panel */}
      {!collapsed && language === "math" && isEditable && (
        <div
          className="absolute bottom-2 right-2 z-20"
          contentEditable={false}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <Popover open={showLatexHint} onOpenChange={setShowLatexHint}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                aria-label={t("latexSyntaxReference")}
                aria-expanded={showLatexHint}
                data-state={showLatexHint ? "open" : "closed"}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 w-6 p-0 rounded-md",
                  "border border-[var(--goose-block-subtle-border)] bg-[var(--goose-block-subtle-bg)]",
                )}
              >
                <GooseIcons.HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              editorContext
              side="top"
              align="end"
              className="w-[420px] max-w-[calc(100vw-2rem)] rounded-lg border bg-background p-3 shadow-lg"
              aria-label={t("latexSyntaxReference")}
              manageFocus={false}
            >
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <span className="text-xs font-semibold">{t("latexSyntaxReference")}</span>
                <EditorAction
                  type="button"
                  onClick={() => setShowLatexHint(false)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground  "
                >
                  <GooseIcons.X className="h-3.5 w-3.5" />
                </EditorAction>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 gap-1.5">
                  {LATEX_SNIPPETS.map((s, i) => (
                    <EditorAction
                      key={i}
                      type="button"
                      onClick={() => setShowLatexHint(false)}
                      className="flex flex-col items-start gap-1 rounded-md border border-[var(--goose-block-subtle-border)] bg-[var(--goose-block-subtle-bg)] px-2 py-1.5 text-left  "
                    >
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {s.label}
                      </span>
                      <code className="text-[11px] font-mono text-foreground break-all">
                        {s.code}
                      </code>
                    </EditorAction>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </>
  );
}
