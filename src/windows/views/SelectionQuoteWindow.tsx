import { Button } from "@/components/ui/button";
import { Quote } from "@/components/ui/icons";
import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n/core";
import { completeAuxiliary, openPageInMain, useAuxiliaryWindow } from "@/windows/AuxiliaryWindowContext";
import { StandaloneWindowShell } from "@/windows/shell/StandaloneWindowShell";
import { readSelectionQuotePayload } from "./selectionQuotePayload";

const text = createTranslator(i18nYaml<"src/windows/views/SelectionQuoteWindow.tsx#block1:1">`
zh-Hans:
  windowTitle: "选区引用"
  openSource: "打开来源笔记"
  unavailable: "来源笔记不可用"
en:
  windowTitle: "Selection quote"
  openSource: "Open source note"
  unavailable: "Source note unavailable"
ja:
  windowTitle: "選択範囲の引用"
  openSource: "元のノートを開く"
  unavailable: "元のノートは利用できません"
`);

export function SelectionQuoteWindow() {
  useLocale();
  const { payload, resizable } = useAuxiliaryWindow();
  const quote = readSelectionQuotePayload(payload);
  if (!quote) return null;
  const title = quote.pageTitle || text("windowTitle");
  const openSource = () => {
    if (!quote.sourceAvailable || !quote.pageId) return;
    void openPageInMain(quote.pageId, quote.location).finally(() => {
      void completeAuxiliary("confirmed");
    });
  };

  return (
    <StandaloneWindowShell title={title} windowTitle={text("windowTitle")} maximizable={resizable}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-5">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
            <Quote className="h-4 w-4 shrink-0 text-[var(--goose-accent-text)]" />
            <span className="truncate">{title}</span>
          </div>
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {quote.text}
          </div>
        </div>
        <footer className="flex shrink-0 border-t border-border px-4 py-3">
          <Button variant="outline" size="sm" disabled={!quote.sourceAvailable} onClick={openSource}>
            {quote.sourceAvailable ? text("openSource") : text("unavailable")}
          </Button>
        </footer>
      </div>
    </StandaloneWindowShell>
  );
}
