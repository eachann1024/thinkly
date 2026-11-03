import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";
import { getFormatLocale } from "@/i18n/runtime";
import { ListRow } from "@/components/ui/list-row";
import { pageDisplayTitle } from "@/lib/reflection/noteTitle";
import type { NoteActivity } from "@/lib/reflection/reflectionStats";
import type { ReflectionPage } from "@/windows/data/reflectionSnapshot";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/reflection/ReflectionNoteList.tsx#localMessages:1">`
zh-Hans:
  topNotes: "投入最多的笔记"
  stalled: "可能搁置的笔记"
  edits: "{{edits}} 次编辑"
  words: "+{{added}} 字"
  lastEdit: "最后编辑于 {{date}}"
  idle: "{{days}} 天未动"
en:
  topNotes: "Most worked-on notes"
  stalled: "Possibly stalled notes"
  edits: "{{edits}} edits"
  words: "+{{added}} chars"
  lastEdit: "Last edited {{date}}"
  idle: "{{days}} days idle"
ja:
  topNotes: "最も取り組んだノート"
  stalled: "停滞している可能性のあるノート"
  edits: "{{edits}} 回編集"
  words: "+{{added}} 文字"
  lastEdit: "最終編集: {{date}}"
  idle: "{{days}} 日間未更新"
`;
const uiText = createTranslator(localMessages);

interface Props {
  variant: "top" | "stalled";
  notes: NoteActivity[];
  pages: Record<string, ReflectionPage>;
  onOpen: (pageId: string) => void;
}

const idleDays = (lastAt: number, now: number) => Math.max(1, Math.floor((now - lastAt) / 86_400_000));

export function ReflectionNoteList({ variant, notes, pages, onOpen }: Props) {
  useLocale();
  const items = notes.filter((note) => pages[note.pageId]);
  if (items.length === 0) return null;
  const locale = getFormatLocale();
  const number = new Intl.NumberFormat(locale);
  const date = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const now = Date.now();
  const topEdits = items[0]?.edits ?? 1;
  return (
    <section aria-label={uiText(variant === "top" ? "topNotes" : "stalled")}>
      <h3 className="mb-1 text-sm font-medium text-foreground">
        {uiText(variant === "top" ? "topNotes" : "stalled")}
      </h3>
      {variant === "top" ? (
        <ol className="m-0 list-none p-0">
          {items.map((note, index) => (
            <li key={note.pageId}>
              <ListRow className="flex w-full items-start gap-3 px-2 py-2 text-left" onClick={() => onOpen(note.pageId)}>
                <span
                  aria-hidden="true"
                  className={`w-[18px] shrink-0 text-xs font-semibold tabular-nums leading-5 ${
                    index === 0 ? "text-[var(--goose-accent-solid)]" : "text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex items-baseline gap-2.5">
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {pageDisplayTitle(pages[note.pageId])}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-xs font-medium tabular-nums text-[var(--goose-accent-solid)]">
                      {uiText("edits", { edits: number.format(note.edits) })}
                    </span>
                  </span>
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden="true" className="h-1 flex-1 overflow-hidden rounded-sm bg-muted">
                      <span
                        className={`block h-full rounded-sm ${
                          index === 0
                            ? "bg-[var(--goose-accent-solid)]"
                            : "bg-[color-mix(in_srgb,var(--goose-accent-solid)_55%,var(--goose-shell-bg))]"
                        }`}
                        style={{ width: `${Math.round((note.edits / topEdits) * 100)}%` }}
                      />
                    </span>
                    <span className="min-w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {uiText("words", { added: number.format(note.added) })}
                    </span>
                  </span>
                </span>
              </ListRow>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((note) => (
            <li key={note.pageId}>
              <ListRow className="flex w-full items-center gap-3 px-2 py-2 text-left" onClick={() => onOpen(note.pageId)}>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium text-foreground">{pageDisplayTitle(pages[note.pageId])}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {uiText("lastEdit", { date: date.format(note.lastAt) })}
                  </span>
                </span>
                <span className="shrink-0 whitespace-nowrap rounded-md bg-[var(--goose-interactive-warning)] px-2 py-0.5 text-xs font-medium tabular-nums text-warning">
                  {uiText("idle", { days: number.format(idleDays(note.lastAt, now)) })}
                </span>
              </ListRow>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
