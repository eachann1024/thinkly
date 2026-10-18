import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/editor-split/SplitPaneMoreMenu.tsx#localMessages:1">`
zh-Hans:
  more: "更多"
  splitRight: "向右拆分"
  splitDown: "向下拆分"
  openInNewTab: "在新标签页打开"
  closeOthers: "关闭其他分屏"
  copyLink: "复制笔记链接"
  maximize: "放大"
  restore: "还原"
en:
  more: "More"
  splitRight: "Split right"
  splitDown: "Split down"
  openInNewTab: "Open in new tab"
  closeOthers: "Close other panes"
  copyLink: "Copy note link"
  maximize: "Maximize"
  restore: "Restore"
ja:
  more: "その他"
  splitRight: "右に分割"
  splitDown: "下に分割"
  openInNewTab: "新しいタブで開く"
  closeOthers: "他のペインを閉じる"
  copyLink: "ノートのリンクをコピー"
  maximize: "拡大"
  restore: "元に戻す"
`;
const uiText = createTranslator(localMessages);
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Columns2, Link, Maximize2, Minimize2, MoreHorizontal, PanelTopOpen, Rows2 } from "@/components/ui/icons";
import { focusSplitPane, splitDown, splitRight } from "@/lib/editor-split/commands";
import { MAX_SPLIT_LEAVES, countLeaves } from "@/lib/editor-split/tree";
import {
  closeOtherSplitPanes,
  copySplitPaneNoteLink,
  moveSplitPaneToNewTab,
} from "@/lib/editor-split/paneMenuActions";
import { useEffectiveSingleTabMode } from "@/lib/tabMode";
import { toggleMaximizePane, useEditorSplit } from "@/stores/useEditorSplit";
import type { Page } from "@/types";

export function SplitPaneMoreMenu({
  tabId,
  leafId,
  page,
  missing = false,
  open,
  onOpenChange,
}: {
  tabId: string;
  leafId: string;
  page?: Page;
  missing?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useLocale();
  const singleTab = useEffectiveSingleTabMode();
  const leafCount = useEditorSplit((state) => {
    const split = state.byTabId[tabId];
    return split ? countLeaves(split.root) : 0;
  });
  const maximized = useEditorSplit(
    (state) => state.maximizedPaneIdByTab[tabId] === leafId,
  );
  const atLimit = leafCount >= MAX_SPLIT_LEAVES;
  const splitThisPane = (run: () => Promise<boolean>) => {
    focusSplitPane(tabId, leafId, { focusEditor: false });
    void run();
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <IconButton
          size="xs"
          tone="muted"
          type="button"
          className="editor-split-more"
          aria-label={uiText("more")}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="editor-split-page-menu">
        <DropdownMenuItem disabled={atLimit} onSelect={() => splitThisPane(splitRight)}>
          <Columns2 className="h-4 w-4" />
          {uiText("splitRight")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={atLimit} onSelect={() => splitThisPane(splitDown)}>
          <Rows2 className="h-4 w-4" />
          {uiText("splitDown")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={missing || !page || singleTab}
          onSelect={() => moveSplitPaneToNewTab(tabId, leafId)}
        >
          <PanelTopOpen className="h-4 w-4" />
          {uiText("openInNewTab")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={leafCount < 2}
          onSelect={() => closeOtherSplitPanes(tabId, leafId)}
        >
          {uiText("closeOthers")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={missing || !page}
          onSelect={() => {
            if (page) void copySplitPaneNoteLink(page);
          }}
        >
          <Link className="h-4 w-4" />
          {uiText("copyLink")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={leafCount < 2}
          onSelect={() => toggleMaximizePane(tabId, leafId)}
        >
          {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {maximized ? uiText("restore") : uiText("maximize")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
