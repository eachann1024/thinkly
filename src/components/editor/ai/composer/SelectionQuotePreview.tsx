import { Button } from "@/components/ui/button";
import { Quote } from "@/components/ui/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import { usePages } from "@/stores/usePages";
import { navigateNotebookAiReference } from "@/lib/notebook-ai/navigateReference";
import type { AiSelectionQuoteAttrs } from "./selectionQuoteData";
import "./selection-quote.css";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/ai/composer/SelectionQuotePreview.tsx#messages:1">`
zh-Hans:
  selectionReference: "选区引用"
  openSourceNote: "打开来源笔记"
  sourceNoteUnavailable: "来源笔记不可用"
en:
  selectionReference: "Selection reference"
  openSourceNote: "Open source note"
  sourceNoteUnavailable: "Source note unavailable"
ja:
  selectionReference: "選択範囲の引用"
  openSourceNote: "元のノートを開く"
  sourceNoteUnavailable: "元のノートは利用できません"
`;
const t = createTranslator(messages);


export function SelectionQuotePreview({ quote, onClose }: {
  quote: AiSelectionQuoteAttrs | null;
  onClose: () => void;
}) {
  useLocale();
  const { onOpenPage } = useEditorPageContext();
  const sourceExists = usePages((state) => Boolean(quote && state.pages[quote.pageId] && !state.pages[quote.pageId].trashedAt));
  return (
    <Dialog open={Boolean(quote)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[min(440px,calc(100vw-32px))] gap-4 p-5" aria-describedby={undefined}>
        <DialogTitle className="flex min-w-0 items-center gap-2 pr-7 text-sm">
          <Quote className="h-4 w-4 shrink-0 text-[var(--goose-accent-text)]" />
          <span className="truncate">{quote?.pageTitle || t("selectionReference")}</span>
        </DialogTitle>
        <div className="max-h-[50dvh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed">
          {quote?.text}
        </div>
        <Button variant="outline" className="justify-self-start" disabled={!sourceExists}
          onClick={() => {
            if (!quote || !sourceExists) return;
            navigateNotebookAiReference(quote.pageId, onOpenPage);
            onClose();
          }}>
          {sourceExists ? t("openSourceNote") : t("sourceNoteUnavailable")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
