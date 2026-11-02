import { useId, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Globe } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import { noteCitationKey, noteCitationsInText, noteSourceLabel } from "@/lib/notebook-ai/noteCitation";
import { navigateNotebookAiReference } from "@/lib/notebook-ai/navigateReference";
import { usePages } from "@/stores/usePages";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { openExternalUrl } from "../ai-cards/webLinks";
import { ExecutionDisclosure } from "./ExecutionDisclosure";
import { executionSources, formatExecutionTime } from "./executionPresentation";
import type { ToolProgressPart } from "./toolProgressModel";
import type { NotebookAiExecution } from "@/lib/notebook-ai/types";
import { useLocale, i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ExecutionSources.tsx#messages:1">`
zh-Hans:
  sources: "已读取 {{count}} 个来源"
  previous: "上一页来源"
  next: "下一页来源"
  pages: "来源页码"
en:
  sources: "{{count}} sources read"
  previous: "Previous sources"
  next: "Next sources"
  pages: "Source page"
ja:
  sources: "読み取り済みのソース {{count}} 件"
  previous: "前のソース"
  next: "次のソース"
  pages: "ソースのページ"
`;
const t = createTranslator(messages);

export function ExecutionSources({ parts, execution, answerText = "" }: { parts: ToolProgressPart[]; execution?: NotebookAiExecution; answerText?: string }) {
  const locale = useLocale();
  const { onOpenPage } = useEditorPageContext();
  const sources = useMemo(() => {
    const read = execution?.sources ?? executionSources(parts);
    const citations = noteCitationsInText(answerText);
    const citedPages = new Set(citations.map(citation => citation.pageId));
    return [...read.filter(source => !citedPages.has(source.id)), ...citations.map(citation => {
      const base = read.find(source => source.id === citation.pageId);
      const page = usePages.getState().pages[citation.pageId];
      return { ...base, id: citation.pageId, title: base?.title ?? (page ? getPageTitle(page) : citation.pageId),
        kind: "note" as const, location: citation.location };
    })];
  }, [execution?.sources, parts, answerText]);
  const [open, setOpen] = useState(false);
  const [requestedPage, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(sources.length / 24));
  const page = Math.min(requestedPage, pages - 1);
  const id = useId();
  if (!sources.length) return null;
  return <div className="notebook-ai-execution-sources notebook-ai-work-trace notebook-ai-work-trace--foldable">
    <Button variant="ghost" size={null} contentStyle="preserve" className="notebook-ai-work-toggle"
      aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <ChevronRight className="notebook-ai-work-chev" size={16} /><span className="notebook-ai-work-toggle-label">{t("sources", { count: sources.length })}</span>
    </Button>
    <ExecutionDisclosure open={open} id={id}>
      <ul className="notebook-ai-execution-source-list">
        {sources.slice(page * 24, (page + 1) * 24).map((source, index) => {
          const timing = source.toolCallId ? execution?.tools[source.toolCallId] : undefined;
          const Icon = source.kind === "note" ? FileText : Globe;
          return <li key={noteCitationKey(source.id, source.location)} aria-posinset={page * 24 + index + 1} aria-setsize={sources.length}><Button variant="ghost" size={null} contentStyle="preserve"
            className="notebook-ai-execution-source" title={noteSourceLabel(source.title, source.location)}
            onClick={() => source.url ? openExternalUrl(source.url) : navigateNotebookAiReference(source.id, onOpenPage, source.location)}>
            <Icon size={16} /><span>{noteSourceLabel(source.title, source.location)}</span>
            {timing?.endedAt && timing.endedAt - timing.startedAt >= 50 ? <time>{formatExecutionTime(timing.endedAt - timing.startedAt, locale)}</time> : null}
          </Button></li>;
        })}
      </ul>
      {pages > 1 ? <nav className="notebook-ai-work-pages" aria-label={t("pages")}>
        <Button variant="ghost" size={null} contentStyle="preserve" aria-label={t("previous")} title={t("previous")} disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></Button>
        <span>{page + 1} / {pages}</span>
        <Button variant="ghost" size={null} contentStyle="preserve" aria-label={t("next")} title={t("next")} disabled={page === pages - 1} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></Button>
      </nav> : null}
    </ExecutionDisclosure>
  </div>;
}
