import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/tree/TreeEmptyState.tsx#localMessages:1">`
zh-Hans:
  noNotesYetClickAboveTo_6d5a: "暂无笔记，点击上方 ＋ 新建"
  linkALocalFolderFirst_909e: "请先关联本地文件夹"
  openLocalFolder_3c1e: "打开本地文件夹"
en:
  noNotesYetClickAboveTo_6d5a: "No notes yet. Click + above to create one."
  linkALocalFolderFirst_909e: "Link a local folder first"
  openLocalFolder_3c1e: "Open local folder"
ja:
  noNotesYetClickAboveTo_6d5a: "ノートがありません。上の ＋ で新規作成してください"
  linkALocalFolderFirst_909e: "先にローカルフォルダを関連付けてください"
  openLocalFolder_3c1e: "ローカルフォルダを開く"
`;
const uiText = createTranslator(localMessages);
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "@/components/ui/icons";
import {
  DotDecor,
  NoFolderTrailArt,
  NoFolderTreeArt,
  TreeFadeArt,
  TreeTrailArt,
} from "@/components/ui/dot-matrix";
import { useOpenLocalFolder } from "@/pages/workspace/components/page/empty-state/usePageEmptyState";

interface TreeEmptyStateProps {
  isLocalNotebook: boolean;
  /** 侧栏树可视区高度；有值时用它做垂直居中，避免 flex 高度链断裂 */
  height?: number;
}

/** 尚未关联本地文件夹：待生成的文件树 + 指向按钮的点阵路径，整组在内容区居中。 */
function NoFolderState({ height }: { height: number }) {
  const openLocalFolder = useOpenLocalFolder();
  const hasMeasuredHeight = height > 0;
  return (
    <div
      className={cn(
        "relative box-border flex w-full items-center justify-center overflow-hidden px-4",
        hasMeasuredHeight ? "shrink-0" : "min-h-0 flex-1",
      )}
      style={hasMeasuredHeight ? { height } : undefined}
    >
      <DotDecor preset="noFolder" />
      <div data-no-folder-group className="relative z-[1] flex max-w-full flex-col items-center text-center">
        <NoFolderTreeArt className="h-auto max-w-full text-foreground" />
        <p className="mt-3.5 text-sm font-normal leading-5 text-muted-foreground">
          {uiText("linkALocalFolderFirst_909e")}
        </p>
        <NoFolderTrailArt className="-mb-1.5 mt-2.5 text-foreground" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-4 max-w-full border-[var(--goose-accent-solid)] bg-[color-mix(in_srgb,var(--goose-accent-solid)_10%,transparent)] text-[var(--goose-accent-solid)] hover:bg-[color-mix(in_srgb,var(--goose-accent-solid)_18%,transparent)] hover:text-[var(--goose-accent-solid)]"
          onClick={() => { void openLocalFolder(); }}
        >
          <FolderOpen aria-hidden="true" />
          {uiText("openLocalFolder_3c1e")}
        </Button>
      </div>
    </div>
  );
}

export function TreeEmptyState({
  isLocalNotebook,
  height = 0,
}: TreeEmptyStateProps) {
  useLocale();
  const hasMeasuredHeight = height > 0;
  if (!isLocalNotebook) return <NoFolderState height={height} />;

  return (
    <div
      className={cn(
        "relative box-border w-full overflow-hidden px-4 pt-3 text-left",
        hasMeasuredHeight ? "shrink-0" : "min-h-0 flex-1",
      )}
      style={hasMeasuredHeight ? { height } : undefined}
    >
      <TreeTrailArt className="pointer-events-none absolute right-0 top-0 text-foreground" />
      <p className="relative text-sm font-normal leading-relaxed text-muted-foreground">
        {uiText("noNotesYetClickAboveTo_6d5a")}
      </p>
      <TreeFadeArt className="pointer-events-none absolute bottom-0 left-0 text-foreground" />
    </div>
  );
}
