import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/editor-split/SplitPaneMoreMenu.tsx#localMessages:1">`
zh-Hans:
  more: "更多"
  splitRight: "向右拆分"
  splitDown: "向下拆分"
  openRight: "在右侧打开此笔记"
  openDown: "在下方打开此笔记"
  openInNewTab: "在新标签页打开"
  closeOthers: "关闭其他分屏"
  copyLink: "复制笔记链接"
  syncScroll: "同步滚动"
  layout: "布局"
  maximize: "放大"
  restore: "还原"
en:
  more: "More"
  splitRight: "Split right"
  splitDown: "Split down"
  openRight: "Open this note to the right"
  openDown: "Open this note below"
  openInNewTab: "Open in new tab"
  closeOthers: "Close other panes"
  copyLink: "Copy note link"
  syncScroll: "Sync scrolling"
  layout: "Layout"
  maximize: "Maximize"
  restore: "Restore"
ja:
  more: "その他"
  splitRight: "右に分割"
  splitDown: "下に分割"
  openRight: "このノートを右に開く"
  openDown: "このノートを下に開く"
  openInNewTab: "新しいタブで開く"
  closeOthers: "他のペインを閉じる"
  copyLink: "ノートのリンクをコピー"
  syncScroll: "スクロールを同期"
  layout: "レイアウト"
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
  DropdownMenuSub,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronRight, Columns2, Link, Maximize2, Minimize2, MoreHorizontal, PanelTopOpen, Rows2 } from "@/components/ui/icons";
import { focusSplitPane, splitDown, splitRight } from "@/lib/editor-split/commands";
import { openPageBeside } from "@/lib/editor-split/openPageBeside";
import { runSplitLayout } from "@/lib/editor-split/layoutCommands";
import { layoutText } from "@/lib/editor-split/layoutLabels";
import type { SplitLayoutMenuAction } from "@/lib/editor-split/layoutMenu";
import { MAX_SPLIT_LEAVES, countLeaves } from "@/lib/editor-split/tree";
import {
  closeOtherSplitPanes,
  copySplitPaneNoteLink,
  moveSplitPaneToNewTab,
} from "@/lib/editor-split/paneMenuActions";
import { useEffectiveSingleTabMode } from "@/lib/tabMode";
import { isSyncScrollAvailable, isSyncScrollEnabled, toggleMaximizePane, useEditorSplit } from "@/stores/useEditorSplit";
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
  const syncAvailable = useEditorSplit(() => isSyncScrollAvailable(tabId));
  const syncOn = useEditorSplit(() => isSyncScrollEnabled(tabId));
  const atLimit = leafCount >= MAX_SPLIT_LEAVES;
  const splitThisPane = (run: () => Promise<boolean>) => {
    focusSplitPane(tabId, leafId, { focusEditor: false });
    void run();
  };
  const applyLayout = (action: SplitLayoutMenuAction) => {
    focusSplitPane(tabId, leafId, { focusEditor: false });
    void runSplitLayout(action);
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
        <DropdownMenuItem
          disabled={atLimit || missing || !page}
          onSelect={() => page && openPageBeside(page.id, "right")}
        >
          <Columns2 className="h-4 w-4" />
          {uiText("openRight")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={atLimit || missing || !page}
          onSelect={() => page && openPageBeside(page.id, "bottom")}
        >
          <Rows2 className="h-4 w-4" />
          {uiText("openDown")}
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
        {syncAvailable ? (
          <DropdownMenuItem
            aria-checked={syncOn}
            onSelect={() => {
              if (!isSyncScrollAvailable(tabId)) return;
              useEditorSplit.getState().toggleSyncScroll(tabId);
            }}
          >
            <span className="min-w-0 flex-1">{uiText("syncScroll")}</span>
            <Check className={`ml-auto h-4 w-4 shrink-0 ${syncOn ? "" : "invisible"}`} />
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSub>
          <DropdownMenuItem textValue={uiText("layout")}>
            <span className="min-w-0 flex-1">{uiText("layout")}</span>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0" />
          </DropdownMenuItem>
          <DropdownMenuContent side="right" align="start" sideOffset={2}>
            <DropdownMenuItem onSelect={() => applyLayout("columns")}>
              <Columns2 className="h-4 w-4" />
              {layoutText("columns")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => applyLayout("rows")}>
              <Rows2 className="h-4 w-4" />
              {layoutText("rows")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => applyLayout("grid")}>
              {layoutText("grid")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={leafCount < 2} onSelect={() => applyLayout("equalize")}>
              {layoutText("equalize")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuSub>
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
