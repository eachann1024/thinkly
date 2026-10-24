import { useLocale, createTranslator, i18nYaml } from "@/i18n";
import type { Page } from "@/types";
import { cn } from "@/lib/utils";
import { normalizePageLayout } from "@/lib/local-frontmatter";

const messages = i18nYaml<"src/pages/workspace/components/page/page-menu/PageWidthSelector.tsx#messages:1">`
zh-Hans:
  contentWidth: "正文宽度"
  standard: "标准"
  fullWidth: "全宽"
  withDefault: "{{label}}（默认）"
en:
  contentWidth: "Content width"
  standard: "Standard"
  fullWidth: "Full width"
  withDefault: "{{label}} (Default)"
ja:
  contentWidth: "本文の幅"
  standard: "標準"
  fullWidth: "全幅"
  withDefault: "{{label}}（デフォルト）"
`;
const t = createTranslator(messages);

function WidthGlyph({ layout }: { layout: "standard" | "full" }) {
  return (
    <span className="relative flex h-[18px] w-7 items-center justify-center rounded-[4px] border border-current opacity-80">
      <span
        className={cn(
          "flex h-[8px] flex-col justify-between",
          layout === "full" ? "w-[22px]" : "w-3",
        )}
      >
        <span className="h-px w-full bg-current" />
        <span className="h-px w-full bg-current" />
        <span className="h-px w-3/4 bg-current" />
      </span>
    </span>
  );
}

export function PageWidthSelector({
  pageLayout,
  defaultLayout,
  onChange,
}: {
  pageLayout: Page["pageLayout"];
  defaultLayout: Page["pageLayout"];
  onChange: (value: Page["pageLayout"]) => void;
}) {
  useLocale();
  const fallback = normalizePageLayout(defaultLayout);
  const current = normalizePageLayout(pageLayout ?? fallback);
  const choices = [
    { value: "standard", label: t("standard") },
    { value: "full", label: t("fullWidth") },
  ] as const;

  return (
    <div
      role="group"
      aria-label={t("contentWidth")}
      className="goose-segmented-tray grid w-full grid-cols-2 gap-0.5 p-[3px]"
    >
      {choices.map((choice) => (
        <button
          key={choice.value}
          type="button"
          aria-pressed={current === choice.value}
          onClick={() => onChange(choice.value === fallback ? undefined : choice.value)}
          className="goose-segmented-option flex h-14 min-w-0 flex-col items-center justify-center gap-1.5"
        >
          <WidthGlyph layout={choice.value} />
          <span className="truncate text-xs leading-none">
            {choice.value === fallback ? t("withDefault", { label: choice.label }) : choice.label}
          </span>
        </button>
      ))}
    </div>
  );
}
