import { useId, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Globe } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import { navigateNotebookAiReference } from "@/lib/notebook-ai/navigateReference";
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

export function ExecutionSources({ parts, execution }: { parts: ToolProgressPart[]; execution?: NotebookAiExecution }) {
  const locale = useLocale();
  const { onOpenPage } = useEditorPageContext();
  const sources = useMemo(() => execution?.sources ?? executionSources(parts), [execution?.sources, parts]);
  const [open, setOpen] = useState(false);
  const [requestedPage, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(sources.length / 24));
  const page = Math.min(requestedPage, pages - 1);
  const id = useId();
  if (!sources.length) return null;
  return <div className="notebook-ai-execution-sources">
    <Button variant="ghost" size={null} contentStyle="preserve" className="notebook-ai-execution-source-toggle"
      aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <FileText size={16} /><span>{t("sources", { count: sources.length })}</span><ChevronRight className="notebook-ai-work-chev" size={16} />
    </Button>
    <ExecutionDisclosure open={open} id={id}>
      <ul className="notebook-ai-execution-source-list">
        {sources.slice(page * 24, (page + 1) * 24).map((source, index) => {
          const timing = source.toolCallId ? execution?.tools[source.toolCallId] : undefined;
          const Icon = source.kind === "note" ? FileText : Globe;
          return <li key={source.id} aria-posinset={page * 24 + index + 1} aria-setsize={sources.length}><Button variant="ghost" size={null} contentStyle="preserve"
            className="notebook-ai-execution-source" title={source.title}
            onClick={() => source.url ? openExternalUrl(source.url) : navigateNotebookAiReference(source.id, onOpenPage)}>
            <Icon size={16} /><span>{source.title}</span>
            {timing?.endedAt ? <time>{formatExecutionTime(timing.endedAt - timing.startedAt, locale)}</time> : null}
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
