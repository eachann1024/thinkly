import { useLocale, createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/image-export/ThemeRail.tsx#localMessages:1">`
zh-Hans:
  themes: "卡片主题"
  heading: "主题"
  asIs: "原样"
  light: "浅色"
  dark: "深色"
en:
  themes: "Card themes"
  heading: "Themes"
  asIs: "As is"
  light: "Light"
  dark: "Dark"
ja:
  themes: "カードのテーマ"
  heading: "テーマ"
  asIs: "そのまま"
  light: "ライト"
  dark: "ダーク"
`;
const uiText = createTranslator(localMessages);
import { Check } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  CARD_THEMES,
  getCardTheme,
  resolveCardTheme,
  type CardThemeId,
} from "@/lib/imageExport";
import type { NotebookCardThemeContext } from "@/lib/imageExport";
import {
  sessionActiveTheme,
  useImageExportSession,
} from "@/windows/views/image-export/imageExportSession";

const GROUPS = [
  { id: "original", label: () => uiText("asIs") },
  { id: "light", label: () => uiText("light") },
  { id: "dark", label: () => uiText("dark") },
] as const;

function groupOf(id: CardThemeId): (typeof GROUPS)[number]["id"] {
  if (id === "original") return "original";
  return getCardTheme(id).mode;
}

function pickTheme(id: CardThemeId) {
  const session = useImageExportSession.getState();
  if (session.scope === "page") session.setThemeId(id);
  else session.setSelectionTheme(id);
}

export function ThemeRail({ themeContext }: { themeContext: NotebookCardThemeContext }) {
  useLocale();
  const scope = useImageExportSession((s) => s.scope);
  const selectionTheme = useImageExportSession((s) => s.selectionTheme);
  const themeId = useImageExportSession((s) => s.themeId);
  const active = sessionActiveTheme({ scope, selectionTheme, themeId });
  const ctx = themeContext;

  return (
    <nav
      aria-label={uiText("themes")}
      className="flex w-[240px] shrink-0 flex-col overflow-hidden rounded-l-[10px] border border-r-0 border-border bg-[var(--goose-sidebar-surface)]"
    >
      <div className="shrink-0 px-3 pb-1.5 pt-3 text-xs font-medium text-[var(--goose-text-secondary)]">
        {uiText("heading")}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-2">
      {GROUPS.map((group) => {
        const items = CARD_THEMES.filter((theme) => groupOf(theme.id) === group.id);
        return (
          <div key={group.id} className="flex flex-col gap-0.5">
            <div className="flex gap-1.5 px-2 pb-1 pt-2.5 text-[11px] leading-4 text-[var(--goose-text-secondary)]">
              <span>{group.label()}</span>
              {group.id === "original" ? null : <span className="tabular-nums">{items.length}</span>}
            </div>
            {items.map((theme) => {
              const resolved = resolveCardTheme(theme.id, ctx);
              const selected = theme.id === active;
              const hint = theme.id === "original" ? resolved.description : "";
              return (
                <button
                  key={theme.id}
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "flex min-h-9 w-full items-center gap-2.5 rounded-md px-2 py-1 text-left text-[13px] text-foreground transition-colors",
                    selected
                      ? "bg-[var(--goose-interactive-selected)] shadow-[inset_0_0_0_1px_var(--goose-accent-solid)]"
                      : "hover:bg-[var(--goose-interactive-hover)]",
                  )}
                  onClick={() => pickTheme(theme.id)}
                >
                  <span
                    className="flex h-[22px] w-[30px] shrink-0 items-end justify-center overflow-hidden rounded"
                    style={{
                      background: resolved.background,
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)",
                    }}
                  >
                    <span
                      className="box-border h-3.5 w-5 rounded-t-[2px]"
                      style={{
                        background: resolved.cardBg,
                        borderTop: `2px solid ${resolved.accent}`,
                        boxShadow: `inset 0 0 0 1px ${resolved.mode === "dark" ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.08)"}`,
                      }}
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{resolved.name}</span>
                    {hint ? (
                      <span className="truncate text-[11px] leading-[15px] text-[var(--goose-text-secondary)]">
                        {hint}
                      </span>
                    ) : null}
                  </span>
                  {selected ? <Check className="size-3.5 shrink-0 text-[var(--goose-accent-solid)]" /> : null}
                </button>
              );
            })}
          </div>
        );
      })}
      </div>
    </nav>
  );
}
