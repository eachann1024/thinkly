import { useLocale, createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/image-export/ThemeRail.tsx#localMessages:1">`
zh-Hans:
  themes: "卡片主题"
  asIs: "原样"
  light: "浅色"
  dark: "深色"
en:
  themes: "Card themes"
  asIs: "As is"
  light: "Light"
  dark: "Dark"
ja:
  themes: "カードのテーマ"
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
import { notebookThemeContextFromPage } from "@/lib/imageExport/themeContext";
import { useSettings } from "@/stores/useSettings";
import {
  activeImageExportThemeId,
  useImageExportView,
} from "@/stores/useImageExportView";
import type { Page } from "@/types";

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
  const { scope } = useImageExportView.getState();
  if (scope === "page") useSettings.getState().setImageExportThemeId(id);
  else useImageExportView.getState().setSelectionTheme(id);
  useImageExportView.setState({ ratio: null, height: null });
}

export function ThemeRail({ page }: { page: Page }) {
  useLocale();
  const pageTheme = useSettings((s) => s.imageExportThemeId);
  const scope = useImageExportView((s) => s.scope);
  const selectionTheme = useImageExportView((s) => s.selectionTheme);
  const active = activeImageExportThemeId(scope, selectionTheme, pageTheme);
  const ctx = notebookThemeContextFromPage(page);

  return (
    <nav
      aria-label={uiText("themes")}
      className="flex w-[240px] shrink-0 flex-col overflow-y-auto border-y border-l border-border bg-[var(--goose-sidebar-surface)]"
    >
      {GROUPS.map((group) => {
        const items = CARD_THEMES.filter((theme) => groupOf(theme.id) === group.id);
        return (
          <div key={group.id} className="flex flex-col py-2">
            <div className="flex items-baseline justify-between px-3 pb-1 text-xs text-[var(--goose-text-secondary)]">
              <span>{group.label()}</span>
              {group.id === "original" ? null : <span>{items.length}</span>}
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
                    "mx-2 flex min-h-9 items-center gap-2.5 rounded-md px-2 py-1 text-left text-[13px]",
                    selected
                      ? "bg-[var(--goose-interactive-selected)] text-[var(--goose-interactive-selected-fg)]"
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
                      className="h-3.5 w-5 rounded-t-sm"
                      style={{
                        background: resolved.cardBg,
                        borderTop: `2px solid ${resolved.accent}`,
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
                  {selected ? <Check className="size-3.5 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
