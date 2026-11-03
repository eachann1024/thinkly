import type { AiSelectionQuoteAttrs } from "@/components/editor/ai/composer/selectionQuoteData";
import { locationForQuotedText } from "@/lib/notebook-ai/noteCitation";
import { usePages } from "@/stores/usePages";
import type { SelectionQuotePayload } from "@/windows/views/selectionQuotePayload";

const inflight = new Set<string>();

export function openSelectionQuote(quote: AiSelectionQuoteAttrs | null): void {
  if (!quote) return;
  const open = window.gooseDesktop?.auxiliary?.open;
  if (!open) return;
  const key = `${quote.pageId}\u0000${quote.text}`;
  if (inflight.has(key)) return;
  inflight.add(key);
  const page = usePages.getState().pages[quote.pageId];
  const sourceAvailable = Boolean(page && !page.trashedAt);
  const location = sourceAvailable ? locationForQuotedText(page, quote.text) : undefined;
  const payload: SelectionQuotePayload = {
    pageId: quote.pageId,
    pageTitle: quote.pageTitle,
    text: quote.text,
    sourceAvailable,
    ...(location ? { location } : {}),
  };
  void open({ kind: "selection-quote", payload }).catch(() => undefined).finally(() => {
    inflight.delete(key);
  });
}
