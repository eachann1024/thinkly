import { useEffect, useRef, useState } from "react";
import { useBlockNoteEditor } from "@blocknote/react";
import { Popover, PopoverAction, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useEditorPageContext, useEditorSettings } from "../platform/hostContext";
import { getProtectedTitleBlockId } from "../utils/documentTitlePolicy";
import { BLOCK_CONVERSIONS, deleteMenuBlocks, duplicateMenuBlocks, menuBlocks, moveMenuBlocks, selectMenuBlock, type BlockMenuRequest } from "./blockMenuActions";
import { TEXT_COLORS, HIGHLIGHT_COLORS, COLOR_PREVIEW, BG_PREVIEW } from "../toolbars/formatting/colorPalette";
import { canConvertBlocksToColumns, convertBlocksToColumns, findColumnsContext, moveColumnsToBody } from "../blocks/columns/columnActions";
import { writeContextClipboard } from "./contextClipboardWrite";
import { toast } from "@/components/ui/sonner";
import { formatShortcut } from "@/lib/utils";
import { restoreBlockMenuTarget, type BlockMenuTarget } from "./blockMenuTarget";

type MenuSession = BlockMenuRequest & { target: BlockMenuTarget; pageId: string };

export function EditorBlockMenu() {
  const editor = useBlockNoteEditor<any, any, any>();
  const settings = useEditorSettings();
  const { page } = useEditorPageContext();
  const [request, setRequest] = useState<MenuSession | null>(null);
  const [panel, setPanel] = useState<"actions" | "types" | "colors">("actions");
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<BlockMenuRequest>).detail;
      if (!detail?.blockId || !editor.isEditable || !editor.getBlock(detail.blockId)) return;
      if (!(event.target instanceof Node) || !editor.prosemirrorView.dom.contains(event.target)) return;
      const target = editor.prosemirrorView.dom.querySelector<HTMLElement>(`[data-id="${CSS.escape(detail.blockId)}"]`);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const selectedTarget = selectMenuBlock(editor, detail.blockId);
      if (!selectedTarget) return;
      setPanel("actions");
      setRequest({ ...detail, target: selectedTarget, pageId: page.id, x: detail.x ?? rect.left, y: detail.y ?? rect.top });
    };
    document.addEventListener("goose-open-block-menu", open);
    return () => document.removeEventListener("goose-open-block-menu", open);
  }, [editor, page.id]);
  useEffect(() => { setRequest(null); }, [editor, page.id]);
  useEffect(() => {
    if (!request) return;
    return editor.onChange(() => {
      if (editor.prosemirrorView.state.doc !== request.target.doc) setRequest(null);
    });
  }, [editor, request]);
  const blocks = request?.pageId === page.id ? menuBlocks(editor, request.target) : [];
  const available = blocks.length > 0;
  const title = getProtectedTitleBlockId(editor);
  const protectedSelection = blocks.some((block) => block!.id === title);
  const inline = blocks.length > 0 && blocks.every((block) => editor.schema.blockSchema[block!.type]?.content === "inline");
  const columns = request ? findColumnsContext(editor, request.blockId) : undefined;
  const rowClass = "rounded-md px-2.5 py-1.5 text-sm focus:bg-accent hover:bg-accent";
  const run = (action: (targets: typeof blocks) => void) => {
    const targets = request?.pageId === page.id ? menuBlocks(editor, request.target) : [];
    if (!targets.length) {
      toast.error("笔记内容已变化，请重新打开块菜单");
      setRequest(null);
      return;
    }
    action(targets);
  };
  const update = (props: Record<string, unknown>) => run((targets) => editor.transact(() => {
    targets.forEach((block) => editor.updateBlock(block, { props }));
  }));
  return <Popover open={Boolean(request)} onOpenChange={(open) => { if (!open) setRequest(null); }}>
    <PopoverAnchor aria-hidden style={{ position: "fixed", left: request?.x ?? 0, top: request?.y ?? 0, width: 1, height: 1, pointerEvents: "none" }} />
    <PopoverContent ref={content} editorContext side="right" align="start" className="w-56 max-h-[min(480px,70vh)] overflow-y-auto p-1" aria-label="块操作"
      onCloseAutoFocus={(event) => { event.preventDefault(); editor.focus(); }}
      onKeyDown={(event) => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        const rows = [...(content.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
        if (!rows.length) return;
        event.preventDefault();
        const index = rows.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? rows.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length;
        rows[next]?.focus();
      }}>
      {panel !== "actions" && <PopoverAction className={rowClass} onSelect={(event) => { event.preventDefault(); setPanel("actions"); }}>返回</PopoverAction>}
      {panel === "actions" && <>
        <PopoverAction className={rowClass} disabled={!inline || protectedSelection} onSelect={(event) => { event.preventDefault(); setPanel("types"); }}>转换为…</PopoverAction>
        <PopoverAction className={rowClass} disabled={!inline || protectedSelection} onSelect={(event) => { event.preventDefault(); setPanel("colors"); }}>颜色…</PopoverAction>
        <PopoverAction className={rowClass} disabled={!canConvertBlocksToColumns(editor, blocks)} onSelect={() => run((targets) => { convertBlocksToColumns(editor, 2, targets); })}>分为两栏</PopoverAction>
        <PopoverAction className={rowClass} disabled={!canConvertBlocksToColumns(editor, blocks)} onSelect={() => run((targets) => { convertBlocksToColumns(editor, 3, targets); })}>分为三栏</PopoverAction>
        {columns && <PopoverAction className={rowClass} disabled={!available} onSelect={() => run(() => { moveColumnsToBody(editor, request!.blockId); })}>移出分栏</PopoverAction>}
        <PopoverAction className={rowClass} disabled={!available} onSelect={() => run(() => { duplicateMenuBlocks(editor, request!.target); })}>创建副本 <span className="ml-auto text-muted-foreground">{formatShortcut("Mod+D")}</span></PopoverAction>
        <PopoverAction className={rowClass} disabled={!available} onSelect={() => run(() => {
          editor.focus();
          if (!restoreBlockMenuTarget(editor, request!.target)) return;
          if (!document.execCommand("copy")) void writeContextClipboard(editor.prosemirrorView).catch((error) => toast.error(error instanceof Error ? error.message : "复制失败"));
        })}>复制</PopoverAction>
        <PopoverAction className={rowClass} disabled={!available || protectedSelection} onSelect={() => run(() => { moveMenuBlocks(editor, "up", request!.target); })}>上移</PopoverAction>
        <PopoverAction className={rowClass} disabled={!available || protectedSelection} onSelect={() => run(() => { moveMenuBlocks(editor, "down", request!.target); })}>下移</PopoverAction>
        <PopoverAction className={`${rowClass} text-destructive`} disabled={!available || protectedSelection} onSelect={() => run(() => { deleteMenuBlocks(editor, request!.target); })}>删除</PopoverAction>
      </>}
      {panel === "types" && BLOCK_CONVERSIONS.map((target) => <PopoverAction key={target.label} className={rowClass} disabled={!available || protectedSelection} onSelect={() => run((targets) => {
        editor.transact(() => targets.forEach((block) => editor.updateBlock(block, {
          type: target.type,
          props: { ...("props" in target ? target.props : {}), ...(target.type === "codeBlock" ? { wrap: settings.defaultCodeBlockWrap } : {}) },
        })));
      })}>{target.label}</PopoverAction>)}
      {panel === "colors" && <>
        {TEXT_COLORS.map(({ name, color }) => <PopoverAction key={`text-${color}`} className={rowClass} onSelect={() => update({ textColor: color })}><span className="mr-2" style={{ color: COLOR_PREVIEW[color] }}>A</span>{name}</PopoverAction>)}
        <hr className="my-1 border-border" />
        {HIGHLIGHT_COLORS.map(({ name, color }) => <PopoverAction key={`bg-${color}`} className={rowClass} onSelect={() => update({ backgroundColor: color })}><span className="mr-2 rounded px-1" style={{ background: BG_PREVIEW[color] }}>A</span>{name}</PopoverAction>)}
      </>}
    </PopoverContent>
  </Popover>;
}
