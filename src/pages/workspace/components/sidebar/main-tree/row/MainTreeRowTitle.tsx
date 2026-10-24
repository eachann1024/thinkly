import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/main-tree/row/MainTreeRowTitle.tsx#localMessages:1">`
zh-Hans:
  itemCount: "{{count}} 项"
en:
  itemCount: "Items: {{count}}"
ja:
  itemCount: "{{count}} 項目"
`;
const uiText = createTranslator(localMessages);
import { useSettings } from "@/stores/useSettings";

const TITLE_CLASS =
  "relative z-10 truncate flex-1 min-w-0 pointer-events-none leading-snug";

export function MainTreeRowTitle({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  useLocale();
  const enabled = useSettings((state) => state.showSidebarFolderCount);
  if (!enabled || count <= 0) return <span className={TITLE_CLASS}>{title}</span>;
  return (
    <span className="main-tree-row-title relative z-10 flex h-[18px] min-w-0 flex-1 flex-wrap content-start items-center gap-x-2 overflow-hidden pointer-events-none">
      <span className="h-[18px] min-w-0 max-w-full flex-auto truncate leading-[18px]">
        {title}
      </span>
      <span
        className="main-tree-row-count"
        aria-label={uiText("itemCount", { count })}
      >
        {count}
      </span>
    </span>
  );
}
