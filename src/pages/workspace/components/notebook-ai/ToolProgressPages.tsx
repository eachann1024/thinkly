import { useLocale, i18nYaml, createTranslator } from "@/i18n";
import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from "@/components/ui/icons";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ToolProgressPages.tsx#messages:1">`
zh-Hans:
  first: "最早步骤"
  previous: "上一页步骤"
  next: "下一页步骤"
  last: "最新步骤"
  page: "步骤页码"
en:
  first: "First steps"
  previous: "Previous steps"
  next: "Next steps"
  last: "Latest steps"
  page: "Step page"
ja:
  first: "最初のステップ"
  previous: "前のステップ"
  next: "次のステップ"
  last: "最新のステップ"
  page: "ステップのページ"
`;
const t = createTranslator(messages);

export function ToolProgressPages({ page, pages, onPage }: {
  page: number; pages: number; onPage: (page: number) => void;
}) {
  useLocale();
  const [draft, setDraft] = useState(String(page + 1));
  useEffect(() => setDraft(String(page + 1)), [page]);
  const commit = () => {
    const value = Number(draft);
    const next = Number.isFinite(value) ? Math.max(0, Math.min(pages - 1, Math.floor(value) - 1)) : page;
    onPage(next);
    setDraft(String(next + 1));
  };
  return (
    <nav className="notebook-ai-work-pages" aria-label={t("page")}>
      {[
        { icon: ChevronsLeft, label: t("first"), target: 0, disabled: page === 0 },
        { icon: ChevronLeft, label: t("previous"), target: page - 1, disabled: page === 0 },
      ].map(({ icon: Icon, label, target, disabled }) => <Button key={label} contentStyle="preserve" variant="ghost" size={null} aria-label={label} title={label} disabled={disabled} onClick={() => onPage(target)}><Icon size={14} /></Button>)}
      <input aria-label={t("page")} inputMode="numeric" value={draft} onChange={event => setDraft(event.target.value)} onBlur={event => { if (!(event.relatedTarget instanceof Element) || !event.currentTarget.closest("nav")?.contains(event.relatedTarget)) commit(); else setDraft(String(page + 1)); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); commit(); } else if (event.key === "Tab") commit(); }} />
      <span>/ {pages}</span>
      {[
        { icon: ChevronRight, label: t("next"), target: page + 1, disabled: page === pages - 1 },
        { icon: ChevronsRight, label: t("last"), target: pages - 1, disabled: page === pages - 1 },
      ].map(({ icon: Icon, label, target, disabled }) => <Button key={label} contentStyle="preserve" variant="ghost" size={null} aria-label={label} title={label} disabled={disabled} onClick={() => onPage(target)}><Icon size={14} /></Button>)}
    </nav>
  );
}
