import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, FileText } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import { noteCitationKey, noteCitationsInText, noteSourceLabel } from "@/lib/notebook-ai/noteCitation";
import { navigateNotebookAiReference } from "@/lib/notebook-ai/navigateReference";
import { usePages } from "@/stores/usePages";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { openExternalUrl } from "../ai-cards/webLinks";
import { executionSources } from "./executionPresentation";
import type { ToolProgressPart } from "./toolProgressModel";
import type { NotebookAiExecution, NotebookAiExecutionSource } from "@/lib/notebook-ai/types";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ExecutionSources.tsx#messages:1">`
zh-Hans:
  sources: "来源"
  note: "页面 {{count}}"
  web: "网页 {{count}}"
  previous: "上一页来源"
  next: "下一页来源"
  pages: "来源页码"
en:
  sources: "Sources"
  note: "Pages {{count}}"
  web: "Web {{count}}"
  previous: "Previous sources"
  next: "Next sources"
  pages: "Source page"
ja:
  sources: "ソース"
  note: "ページ {{count}}"
  web: "ウェブ {{count}}"
  previous: "前のソース"
  next: "次のソース"
  pages: "ソースのページ"
`;
const t = createTranslator(messages);
const PAGE_SIZE = 24;
type Kind = NotebookAiExecutionSource["kind"];

function urlLabel(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.host.replace(/^www\./, "")}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch { return url; }
}

export function useExecutionSources(parts: ToolProgressPart[], execution?: NotebookAiExecution, answerText = "") {
  return useMemo(() => {
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
}

export function ExecutionSources({ sources }: { sources: NotebookAiExecutionSource[] }) {
  const { onOpenPage } = useEditorPageContext();
  const counts = { note: 0, web: 0 };
  for (const source of sources) counts[source.kind] += 1;
  const kinds = (["note", "web"] as const).filter(kind => counts[kind] > 0);
  const [requestedKind, setKind] = useState<Kind | null>(null);
  const kind = requestedKind && counts[requestedKind] ? requestedKind : kinds[0];
  const [requestedPage, setPage] = useState(0);
  if (!kind) return null;
  const visible = sources.filter(source => source.kind === kind);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pages - 1);
  return <section className="notebook-ai-execution-sources" aria-label={t("sources")}>
    <SegmentedControl className="notebook-ai-execution-source-tabs" aria-label={t("sources")} value={kind}
      onValueChange={value => { setKind(value as Kind); setPage(0); }}
      options={kinds.map(item => ({ value: item, label: t(item, { count: counts[item] }) }))} />
    <ul className="notebook-ai-execution-source-list">
      {visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((source, index) => {
        const label = noteSourceLabel(source.title, source.location);
        return <li key={noteCitationKey(source.id, source.location)} aria-posinset={page * PAGE_SIZE + index + 1} aria-setsize={visible.length}>
          <Button variant="ghost" size={null} contentStyle="preserve" className="notebook-ai-execution-source" data-kind={source.kind}
            title={source.url ?? label}
            onClick={() => source.url ? openExternalUrl(source.url) : navigateNotebookAiReference(source.id, onOpenPage, source.location)}>
            {source.kind === "note" ? <FileText size={16} /> : null}
            <span className="notebook-ai-execution-source-text">
              <span>{label}</span>
              {source.url ? <small>{urlLabel(source.url)}</small> : null}
            </span>
            {source.url ? <ExternalLink size={14} /> : null}
          </Button>
        </li>;
      })}
    </ul>
    {pages > 1 ? <nav className="notebook-ai-work-pages" aria-label={t("pages")}>
      <Button variant="ghost" size={null} contentStyle="preserve" aria-label={t("previous")} title={t("previous")} disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></Button>
      <span>{page + 1} / {pages}</span>
      <Button variant="ghost" size={null} contentStyle="preserve" aria-label={t("next")} title={t("next")} disabled={page === pages - 1} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></Button>
    </nav> : null}
  </section>;
}
