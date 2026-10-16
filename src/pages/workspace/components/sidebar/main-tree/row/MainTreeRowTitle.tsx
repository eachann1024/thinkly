import { useSettings } from "@/stores/useSettings";

const TITLE_CLASS =
  "relative z-10 truncate flex-1 min-w-0 pointer-events-none leading-snug";

/**
 * 行标题与文件夹数量。数量放在可换行的单行容器里：名称与数量放不下时
 * 数量折到第二行并被裁掉，名称始终优先完整显示，无需测量。
 */
export function MainTreeRowTitle({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  const enabled = useSettings((state) => state.showSidebarFolderCount);
  // leading-snug 抵消行容器的 leading-none，避免降部被裁。
  if (!enabled || count <= 0) return <span className={TITLE_CLASS}>{title}</span>;
  return (
    <span className="main-tree-row-title relative z-10 flex h-[18px] min-w-0 flex-1 flex-wrap content-start items-center gap-x-2 overflow-hidden pointer-events-none">
      <span className="h-[18px] min-w-0 max-w-full flex-auto truncate leading-[18px]">
        {title}
      </span>
      <span
        className="main-tree-row-count"
        aria-label={`${count} 项`}
      >
        {count}
      </span>
    </span>
  );
}
