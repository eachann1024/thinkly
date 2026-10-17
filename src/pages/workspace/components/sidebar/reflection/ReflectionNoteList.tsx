import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";
import { getFormatLocale } from "@/i18n/runtime";
import { ListRow } from "@/components/ui/list-row";
import { pageDisplayTitle } from "@/lib/reflection/noteTitle";
import type { NoteActivity } from "@/lib/reflection/reflectionStats";
import type { Page } from "@/types";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionNoteList.tsx#localMessages:1">`
zh-Hans:
  topNotes: "投入最多的笔记"
  stalled: "可能搁置的笔记"
  meta: "{{edits}} 次编辑 · +{{added}} 字"
  lastEdit: "最后编辑于 {{date}}"
en:
  topNotes: "Most worked-on notes"
  stalled: "Possibly stalled notes"
  meta: "{{edits}} edits · +{{added}} chars"
  lastEdit: "Last edited {{date}}"
ja:
  topNotes: "最も取り組んだノート"
  stalled: "停滞している可能性のあるノート"
  meta: "{{edits}} 回編集 · +{{added}} 文字"
  lastEdit: "最終編集: {{date}}"
`;
const uiText = createTranslator(localMessages);

interface Props {
  variant: "top" | "stalled";
  notes: NoteActivity[];
  pages: Record<string, Page>;
  onOpen: (pageId: string) => void;
}

export function ReflectionNoteList({ variant, notes, pages, onOpen }: Props) {
  useLocale();
  const items = notes.filter((n) => pages[n.pageId]);
  if (items.length === 0) return null;
  const locale = getFormatLocale();
  const number = new Intl.NumberFormat(locale);
  const date = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-foreground">
        {uiText(variant === "top" ? "topNotes" : "stalled")}
      </h3>
      <ul className="space-y-0.5">
        {items.map((note) => (
          <li key={note.pageId}>
            <ListRow className="flex w-full items-center justify-between gap-4 px-2 py-2 text-left" onClick={() => onOpen(note.pageId)}>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{pageDisplayTitle(pages[note.pageId])}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {variant === "top"
                  ? uiText("meta", { edits: number.format(note.edits), added: number.format(note.added) })
                  : uiText("lastEdit", { date: date.format(note.lastAt) })}
              </span>
            </ListRow>
          </li>
        ))}
      </ul>
    </div>
  );
}
