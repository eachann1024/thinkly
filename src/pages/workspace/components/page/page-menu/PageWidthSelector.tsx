import { useLocale, createTranslator, i18nYaml } from "@/i18n";
import type { Page } from "@/types";
import { cn } from "@/lib/utils";
import { normalizePageLayout } from "@/lib/local-frontmatter";

const messages = i18nYaml<"src/pages/workspace/components/page/page-menu/PageWidthSelector.tsx#messages:1">`
zh-Hans:
  contentWidth: "正文宽度"
  followDefault: "默认"
  standard: "标准"
  fullWidth: "全宽"
en:
  contentWidth: "Content width"
  followDefault: "Default"
  standard: "Standard"
  fullWidth: "Full width"
`;
const t = createTranslator(messages);

type WidthChoice = "default" | "standard" | "full";

/** 页面示意：外框代表窗口，内条代表正文占用宽度。 */
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
  const current: WidthChoice =
    pageLayout === undefined ? "default" : normalizePageLayout(pageLayout);
  const fallback = normalizePageLayout(defaultLayout);
  const choices: { value: WidthChoice; label: string; glyph: "standard" | "full" }[] = [
    { value: "default", label: t("followDefault"), glyph: fallback },
    { value: "standard", label: t("standard"), glyph: "standard" },
    { value: "full", label: t("fullWidth"), glyph: "full" },
  ];

  return (
    <div
      role="group"
      aria-label={t("contentWidth")}
      className="goose-segmented-tray grid w-full grid-cols-3 gap-0.5 p-[3px]"
    >
      {choices.map((choice) => (
        <button
          key={choice.value}
          type="button"
          aria-pressed={current === choice.value}
          onClick={() =>
            onChange(choice.value === "default" ? undefined : choice.value)
          }
          className="goose-segmented-option flex h-14 min-w-0 flex-col items-center justify-center gap-1.5"
        >
          <WidthGlyph layout={choice.glyph} />
          <span className="truncate text-xs leading-none">{choice.label}</span>
        </button>
      ))}
    </div>
  );
}
