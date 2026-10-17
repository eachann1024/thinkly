import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/tree/TreeEmptyState.tsx#localMessages:1">`
zh-Hans:
  noNotesYetClickAboveTo_6d5a: "暂无笔记，点击上方 ＋ 新建"
  linkALocalFolderFirst_909e: "请先关联本地文件夹"
en:
  noNotesYetClickAboveTo_6d5a: "No notes yet. Click + above to create one."
  linkALocalFolderFirst_909e: "Link a local folder first"
`;
const uiText = createTranslator(localMessages);
import { cn } from "@/lib/utils";

interface TreeEmptyStateProps {
  isLocalNotebook: boolean;
  /** 侧栏树可视区高度；有值时用它做垂直居中，避免 flex 高度链断裂 */
  height?: number;
}

export function TreeEmptyState({
  isLocalNotebook,
  height = 0,
}: TreeEmptyStateProps) {
  useLocale();
  const hasMeasuredHeight = height > 0;

  return (
    <div
      className={cn(
        "box-border w-full px-4 pt-3 text-left",
        !hasMeasuredHeight && "min-h-0",
      )}
      style={undefined}
    >
      <p className="text-sm font-normal leading-relaxed text-muted-foreground">
        {isLocalNotebook
          ? uiText("noNotesYetClickAboveTo_6d5a")
          : uiText("linkALocalFolderFirst_909e")}
      </p>
    </div>
  );
}
