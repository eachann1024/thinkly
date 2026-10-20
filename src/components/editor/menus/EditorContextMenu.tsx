import { insertParagraphAfterBlock } from "../extensions/containedBlockKeyboard";
import { toggleTableSequence } from "../extensions/tableSequenceExtension";
import { useRef, useState } from "react";
import * as GooseIcons from "@/components/ui/icons";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ImageExportThemeSelector } from "@/components/ui/image-export-theme-selector";
import type { CardThemeId, WatermarkConfig } from "@/lib/imageExport";
import { exportSelectionToImage } from "@/lib/imageExport";
import { type BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { isQuickNoteEditorPage } from "@/pages/workspace/components/editor-host/editorContentMode";
import { resolveCopyBlockSelection } from "@/components/editor/extensions/copyCurrentBlockExtension";
import { getEditorSelectionPlainText } from "@/components/editor/utils/clipboard";
import { useEditorContextClipboard } from "./useEditorContextClipboard";
import { getEditorSelectedBlocksForExport } from "@/components/editor/utils/selection";
import { cn, formatShortcut } from "@/lib/utils";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/menus/EditorContextMenu.tsx#messages:1">`
zh-Hans:
  selectedContent: "选中内容"
  cut: "剪切"
  copy: "复制"
  paste: "粘贴"
  insertParagraphBelow: "在块下方插入段落"
  orderedNumbers: "自动追加编号"
  exportSelectionAsImage: "导出所选内容为图片"
en:
  selectedContent: "Selected content"
  cut: "Cut"
  copy: "Copy"
  paste: "Paste"
  insertParagraphBelow: "Insert paragraph below"
  orderedNumbers: "Auto-number rows"
  exportSelectionAsImage: "Export selection as image"
ja:
  selectedContent: "選択した内容"
  cut: "切り取り"
  copy: "コピー"
  paste: "貼り付け"
  insertParagraphBelow: "ブロックの下に段落を挿入"
  orderedNumbers: "行に連番を付ける"
  exportSelectionAsImage: "選択範囲を画像として書き出す"
`;
const t = createTranslator(messages);


// 展示型块不显示右键菜单，文字选区继续使用剪贴板菜单。
// math/mermaid 是 codeBlock 的 language 变体，其 data-content-type 为 "codeBlock"，
// 但需通过父块的 data-language 属性区分；image/file/audio/video/divider/imageResize 直接匹配
const CONTEXT_MENU_EXCLUDED_BLOCK_TYPES = new Set([
  "image",
  "imageResize",
  "file",
  "audio",
  "video",
  "divider",
]);

function isExcludedBlockTarget(target: HTMLElement): boolean {
  if (target.closest(".bn-side-menu")) return true;
  const blockContent = target.closest(".bn-block-content");
  if (!blockContent) return false;
  const contentType = (blockContent as HTMLElement).dataset.contentType ?? "";
  if (CONTEXT_MENU_EXCLUDED_BLOCK_TYPES.has(contentType)) return true;
  // codeBlock 且 language 为 math 或 mermaid 也属于展示型
  if (contentType === "codeBlock") {
    const lang = (blockContent as HTMLElement).dataset.language ?? "";
    if (lang === "math" || lang === "mermaid") return true;
  }
  return false;
}

interface EditorContextMenuProps {
  editor: any;
  editable: boolean;
  page: any;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  handleEditorBlankMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleEditorPasteCapture: (
    event: React.ClipboardEvent<HTMLDivElement>,
  ) => void;
  handleEditorKeyDownCapture?: (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => void;
  // EditorComposer 的属性暂由其他实施范围维护；本菜单不再消费这两项。
  searchProviders: any[];
  customActions: any[];
  effectiveTheme: "light" | "dark";
  isEditorFullWidth: boolean;
  children: React.ReactNode;
}

export function EditorContextMenu({
  editor,
  editable,
  page,
  editorContainerRef,
  handleEditorBlankMouseDown,
  handleEditorPasteCapture,
  handleEditorKeyDownCapture,
  isEditorFullWidth,
  children,
}: EditorContextMenuProps) {
  useLocale();
  const [selectedBlocks, setSelectedBlocks] = useState<BlockNoteContent>([]);
  const [canCopy, setCanCopy] = useState(false);
  const [themeSelectorOpen, setThemeSelectorOpen] = useState(false);
  const [tableSequence, setTableSequence] = useState<{ id: string; enabled: boolean } | null>(null);
  const contextBlockIdRef = useRef<string | null>(null);
  const selectedBlocksRef = useRef<BlockNoteContent>([]);
  const selectedTextRef = useRef("");
  const { handleContextPaste, handleCopySelection, handleCutSelection, rememberContextSelection } =
    useEditorContextClipboard(editor, editable, selectedTextRef);
  // 速记小窗根据草稿页隐藏「生成选中图片」。
  const showSelectionImageExport =
    page?.id !== "__quicknote_draft__";

  const handleContextMenuOpen = () => {
    rememberContextSelection();
    let text = "";
    try {
      text = getEditorSelectionPlainText(editor.prosemirrorState);
    } catch {
      /* ignore */
    }
    const trimmedText = text.trim();
    selectedTextRef.current = trimmedText;
    let copyable = Boolean(trimmedText);
    try {
      copyable =
        copyable || Boolean(resolveCopyBlockSelection(editor.prosemirrorState));
    } catch {
      /* ignore */
    }
    setCanCopy(copyable);

    if (showSelectionImageExport) {
      const blocks = getEditorSelectedBlocksForExport(editor);
      setSelectedBlocks(blocks);
      selectedBlocksRef.current = blocks;
    }
  };

  const handleSelectionThemeConfirm = (
    themeId: CardThemeId,
    watermarkConfig: WatermarkConfig,
  ) => {
    const blocks = selectedBlocksRef.current;
    if (!Array.isArray(blocks) || blocks.length === 0) return;
    const title = page ? getPageTitle(page) : t("selectedContent");
    exportSelectionToImage(blocks, title, themeId, watermarkConfig, page);
  };

  return (
    <>
      <ContextMenu
        onOpenChange={(open) => {
          if (open) handleContextMenuOpen();
        }}
      >
        <ContextMenuTrigger asChild>
          <div
            ref={editorContainerRef}
            onDragStartCapture={(event) => {
              if (
                !(event.target as Element).closest("[data-workspace-drag-source]") &&
                !(event.target as Element).closest(".bn-side-menu") &&
                !(
                  (event.target as Element).closest(".bn-inline-content") &&
                  !window.getSelection()?.isCollapsed
                )
              )
                event.preventDefault();
            }}
            onMouseDown={handleEditorBlankMouseDown}
            onPasteCapture={handleEditorPasteCapture}
            onKeyDownCapture={handleEditorKeyDownCapture}
            onContextMenuCapture={(e) => {
              const blockId = (e.target as HTMLElement)
                .closest(".bn-block-outer[data-id]")?.getAttribute("data-id") ?? null;
              contextBlockIdRef.current = blockId;
              if (!editable || !blockId) {
                setTableSequence(null);
              } else {
                try {
                  const block = editor.getBlock(blockId);
                  setTableSequence(block?.type === "table"
                    ? { id: blockId, enabled: block.props?.sequenceColumn === true }
                    : null);
                } catch {
                  setTableSequence(null);
                }
              }
              rememberContextSelection();
              if (isExcludedBlockTarget(e.target as HTMLElement)) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            data-font-family={page.fontFamily ?? "default"}
            className={cn(
              "workspace-editor-surface relative flex min-h-0 flex-1 flex-col w-full pt-2",
              !__GOOSE_EDITOR_COMPACT__ &&
                !isQuickNoteEditorPage(page) &&
                "pb-[100px]",
              isEditorFullWidth ? "max-w-none" : "max-w-[720px] mx-auto",
            )}
          >
            {children}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {editable && (
            <ContextMenuItem disabled={!canCopy} onSelect={handleCutSelection}>
              <GooseIcons.Scissors className="size-4" />
              {t("cut")}
              <span className="goose-menu-shortcut">
                {formatShortcut("Mod+X")}
              </span>
            </ContextMenuItem>
          )}
          <ContextMenuItem disabled={!canCopy} onSelect={handleCopySelection}>
            <GooseIcons.Copy className="size-4" />
            {t("copy")}
            <span className="goose-menu-shortcut">
              {formatShortcut("Mod+C")}
            </span>
          </ContextMenuItem>
          {editable && (
            <ContextMenuItem onSelect={handleContextPaste}>
              <GooseIcons.Clipboard className="size-4" />
              {t("paste")}
              <span className="goose-menu-shortcut">
                {formatShortcut("Mod+V")}
              </span>
            </ContextMenuItem>
          )}
          {editable && contextBlockIdRef.current && (
            <ContextMenuItem onSelect={() => insertParagraphAfterBlock(editor, contextBlockIdRef.current!)}>
              <GooseIcons.Plus className="size-4" />
              {t("insertParagraphBelow")}
            </ContextMenuItem>
          )}
          {tableSequence && (
            <ContextMenuItem onSelect={() => {
              const target = tableSequence;
              if (!target) return;
              toggleTableSequence(editor, target.id);
            }}>
              <GooseIcons.ListOrdered className="size-4" />
              {t("orderedNumbers")}
              {tableSequence.enabled && <GooseIcons.Check className="ml-auto" />}
            </ContextMenuItem>
          )}
          {showSelectionImageExport && selectedBlocks.length > 0 && (
            <ContextMenuItem
              onSelect={() => {
                selectedBlocksRef.current = selectedBlocks;
                setThemeSelectorOpen(true);
              }}
            >
              <GooseIcons.Image className="size-4" />
              {t("exportSelectionAsImage")}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {showSelectionImageExport && (
        <ImageExportThemeSelector
          open={themeSelectorOpen}
          onOpenChange={setThemeSelectorOpen}
          onConfirm={handleSelectionThemeConfirm}
          mode="selection"
          page={page}
          blocks={selectedBlocks}
        />
      )}
    </>
  );
}
