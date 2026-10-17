import { useLocale } from "@/i18n";
import { diffTextLines } from "../batchPlanDiff";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/approval/ReviewDiff.tsx#messages:1">`
zh-Hans:
  changeDiff: "变更差异"
en:
  changeDiff: "Change diff"
`;
const t = createTranslator(messages);


export function ReviewDiff({
  oldText,
  newText,
}: {
  oldText: string;
  newText: string;
}) {
  useLocale();
  return (
    <div className="notebook-ai-plan-diff" role="group" aria-label={t("changeDiff")}>
      {diffTextLines(oldText, newText).map((line, i) => (
        <div
          key={i}
          className={`notebook-ai-plan-diff-line${line.kind === "eq" ? "" : ` notebook-ai-plan-diff-line--${line.kind}`}`}
        >
          <span aria-hidden>
            {line.kind === "del" ? "−" : line.kind === "add" ? "+" : " "}
          </span>
          <span>{line.text || " "}</span>
        </div>
      ))}
    </div>
  );
}
