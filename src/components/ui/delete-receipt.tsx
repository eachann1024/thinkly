import { CircleAlert, RotateCcw, X } from "@/components/ui/icons";
import { Button } from "./button";
import { IconButton } from "./icon-button";
import { SuccessToastIcon, toast } from "./sonner";

type ReceiptItem = { title: string; deleted: boolean };

/** One receipt for one or many deletions; undo appears only when a real restore is available. */
export function showDeleteReceipt(
  items: ReceiptItem[],
  isLocalFolder: boolean,
  onUndo?: () => void | Promise<void>,
) {
  if (!items.length) return;
  const done = items.filter((item) => item.deleted).length;
  const failed = items.length - done;
  const destination = isLocalFolder ? "系统废纸篓" : "回收站";
  let undoing = false;
  // ponytail: the receipt shows only outcome and undo; add a detail view if item-level diagnostics become necessary.
  const label = failed
    ? done ? `${done} 项已移动，${failed} 项未完成` : `${failed} 项未完成`
    : items.length === 1
      ? `已移入${destination} · ${items[0].title}`
      : `${done} 项已移入${destination}`;

  toast.custom(
    (id) => (
      <section
        aria-label="删除回执"
        role="status"
        className="flex w-full items-center gap-3 text-foreground"
      >
        {failed ? (
          <CircleAlert className="size-5 shrink-0 text-danger" aria-hidden="true" />
        ) : (
          <SuccessToastIcon />
        )}
        <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={label}>{label}</p>
        {done > 0 && onUndo && (
          <Button size="sm" type="button" aria-label="撤回删除" onClick={async () => {
            if (undoing) return;
            undoing = true;
            try {
              await onUndo();
              toast.dismiss(id);
            } catch (error) {
              toast.error("撤回失败", { description: error instanceof Error ? error.message : "请稍后重试，或前往回收站手动恢复" });
            } finally {
              undoing = false;
            }
          }} className="shrink-0 text-xs">
            <RotateCcw className="size-4" aria-hidden="true" />撤回
          </Button>
        )}
        <IconButton type="button" tone="muted" aria-label="关闭删除回执" onClick={() => toast.dismiss(id)} >
          <X className="size-4" aria-hidden="true" />
        </IconButton>
      </section>
    ),
    { duration: 8000, closeButton: false, className: "goose-delete-receipt-toast" },
  );
}
