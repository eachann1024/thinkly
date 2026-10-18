import { Suspense, lazy, useState } from "react";
import { useSearchSession } from "../sidebar/useSearchSession";

const SearchSheet = lazy(() =>
  import("./SearchSheet").then((mod) => ({ default: mod.SearchSheet })),
);

/**
 * 搜索面板的懒加载门：
 * 面板本身连搜索索引、AI 问答一起约 320KB，普通打开笔记时用不到。
 * 首次唤出后再常驻挂载，关闭动画、重开状态都与原来一致。
 */
export function LazySearchSheet(props: { aiNotebookId: string | null }) {
  const open = useSearchSession((state) => state.view.phase !== "closed");
  const [everOpened, setEverOpened] = useState(false);
  if (open && !everOpened) setEverOpened(true);
  if (!everOpened) return null;
  return (
    <Suspense fallback={null}>
      <SearchSheet {...props} />
    </Suspense>
  );
}
