import type { ReactNode } from "react";
import { createTranslator, i18nYaml, useLocale } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/editor-split/PaneSplitMenu.tsx#localMessages:1">`
zh-Hans:
  openRight: "在右侧打开分屏"
  openDown: "在下方打开分屏"
en:
  openRight: "Open a split to the right"
  openDown: "Open a split below"
ja:
  openRight: "右に分割して開く"
  openDown: "下に分割して開く"
`;
const uiText = createTranslator(localMessages);
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Columns2, Rows2 } from "@/components/ui/icons";
import { openPageBeside } from "@/lib/editor-split/openPageBeside";
import { countLeaves, MAX_SPLIT_LEAVES } from "@/lib/editor-split/tree";
import type { SplitLeaf } from "@/lib/editor-split/types";
import { useEditorSplit } from "@/stores/useEditorSplit";
import { usePages } from "@/stores/usePages";

export function paneKeepsOwnContextMenu(target: EventTarget | null): boolean {
  return typeof Element !== "undefined" && target instanceof Element && !!target.closest(
    ".bn-editor, input, textarea, [contenteditable='true'], [data-split-chrome]",
  );
}

export function PaneSplitMenu({
  tabId,
  leaf,
  children,
}: {
  tabId: string;
  leaf: SplitLeaf;
  children: ReactNode;
}) {
  useLocale();
  const page = usePages((state) => state.pages[leaf.pageId]);
  const atLimit = useEditorSplit((state) => {
    const split = state.byTabId[tabId];
    return split ? countLeaves(split.root) >= MAX_SPLIT_LEAVES : false;
  });
  const unavailable = !page || !!page.isFolder || !!page.trashedAt;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="flex h-full min-h-0 min-w-0 flex-col"
          onContextMenuCapture={(event) => {
            if (!paneKeepsOwnContextMenu(event.target)) return;
            event.preventDefault();
          }}
        >
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-[var(--goose-menu-min-width)]">
        <ContextMenuItem
          disabled={unavailable || atLimit}
          onSelect={() => openPageBeside(leaf.pageId, "right")}
        >
          <Columns2 className="h-4 w-4" />
          {uiText("openRight")}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={unavailable || atLimit}
          onSelect={() => openPageBeside(leaf.pageId, "bottom")}
        >
          <Rows2 className="h-4 w-4" />
          {uiText("openDown")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
