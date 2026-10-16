import { Input } from "@/components/editor/ui/input";
import { EditorAction } from "@/components/editor/ui/button";
import type { useEditorComposerInteractions } from "./useEditorComposerInteractions";
type EditorLinkPopoverProps = Pick<
  ReturnType<typeof useEditorComposerInteractions>,
  | "linkPopoverOpen"
  | "linkPopoverRef"
  | "linkPopoverUrl"
  | "editLinkPopover"
  | "closeLinkPopover"
  | "handleLinkPopoverSubmit"
>;

export function EditorLinkPopover({
  linkPopoverOpen,
  linkPopoverRef,
  linkPopoverUrl,
  editLinkPopover,
  closeLinkPopover,
  handleLinkPopoverSubmit,
}: EditorLinkPopoverProps) {
  return (
    <>
      {linkPopoverOpen && (
        <div
          ref={linkPopoverRef}
          className="absolute z-[20020]"
          style={{ top: 8, left: "50%", transform: "translateX(-50%)" }}
        >
          <div className="goose-editor-inline-context-ui flex items-center gap-1.5 rounded-lg border border-border/80 bg-popover p-2 shadow-[0_8px_22px_rgba(15,23,42,0.1),0_1px_3px_rgba(15,23,42,0.06)] dark:border-white/15 dark:bg-popover">
            <Input variant="inline"
              value={linkPopoverUrl}
              onChange={(e) => editLinkPopover(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleLinkPopoverSubmit();
                }
                if (e.key === "Escape") {
                  closeLinkPopover();
                }
              }}
              placeholder="https://..."
              autoFocus
              className="h-8 w-56 px-2.5 text-sm"
            />
            <EditorAction
              type="button"
              onClick={handleLinkPopoverSubmit}
              className="goose-interactive goose-interactive-primary flex h-8 items-center rounded-md px-2.5 text-xs font-medium"
            >
              确认
            </EditorAction>
          </div>
        </div>
      )}
    </>
  );
}
