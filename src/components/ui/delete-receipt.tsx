import { getPlatformKind } from "@/lib/utils";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/components/ui/delete-receipt.tsx#localMessages:1">`
zh-Hans:
  systemTrash: "系统废纸篓"
  systemRecycle: "系统回收站"
  trash: "回收站"
  partialDelete: "{{done}} 项已移动，{{failed}} 项未完成"
  failedDelete: "{{failed}} 项未完成"
  deletedItem: "已移入{{destination}} · {{title}}"
  deletedMany: "{{done}} 项已移入{{destination}}"
  deleteResult: "删除回执"
  undoDelete: "撤回删除"
  undoFailed: "撤回失败"
  restoreManually: "请稍后重试，或前往{{destination}}手动恢复"
  undo: "撤回"
  dismissResult: "关闭删除回执"
en:
  systemTrash: "Trash"
  systemRecycle: "Recycle Bin"
  trash: "Trash"
  partialDelete: "Moved: {{done}} · Failed: {{failed}}"
  failedDelete: "Couldn’t move {{failed}}"
  deletedItem: "Moved to {{destination}} · {{title}}"
  deletedMany: "Moved to {{destination}}: {{done}}"
  deleteResult: "Deletion result"
  undoDelete: "Undo deletion"
  undoFailed: "Couldn’t undo deletion"
  restoreManually: "Try again later, or restore the items from {{destination}}."
  undo: "Undo"
  dismissResult: "Dismiss deletion result"
ja:
  systemTrash: "システムのゴミ箱"
  systemRecycle: "システムのごみ箱"
  trash: "ゴミ箱"
  partialDelete: "{{done}} 件を移動しました（{{failed}} 件は未完了）"
  failedDelete: "{{failed}} 件は未完了です"
  deletedItem: "{{destination}}に移動しました · {{title}}"
  deletedMany: "{{done}} 件を{{destination}}に移動しました"
  deleteResult: "削除の結果"
  undoDelete: "削除を元に戻す"
  undoFailed: "元に戻せませんでした"
  restoreManually: "しばらくしてからもう一度お試しいただくか、{{destination}}から手動で復元してください"
  undo: "元に戻す"
  dismissResult: "削除の結果を閉じる"
`;
const uiText = createTranslator(localMessages);
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
  const destination = isLocalFolder ? uiText(getPlatformKind() === "windows" ? "systemRecycle" : "systemTrash") : uiText("trash");
  let undoing = false;
  // ponytail: the receipt shows only outcome and undo; add a detail view if item-level diagnostics become necessary.
  const label = failed
    ? done ? uiText("partialDelete", {done, failed}) : uiText("failedDelete", {failed})
    : items.length === 1
      ? uiText("deletedItem", {destination, title: items[0].title})
      : uiText("deletedMany", {done, destination});

  toast.custom(
    (id) => (
      <section
        aria-label={uiText("deleteResult")}
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
          <Button size="sm" type="button" aria-label={uiText("undoDelete")} onClick={async () => {
            if (undoing) return;
            undoing = true;
            try {
              await onUndo();
              toast.dismiss(id);
            } catch (error) {
              toast.error(uiText("undoFailed"), { description: error instanceof Error ? error.message : uiText("restoreManually", { destination }) });
            } finally {
              undoing = false;
            }
          }} className="shrink-0 text-xs">
            <RotateCcw className="size-4" aria-hidden="true" />{uiText("undo")}</Button>
        )}
        <IconButton type="button" tone="muted" aria-label={uiText("dismissResult")} onClick={() => toast.dismiss(id)} >
          <X className="size-4" aria-hidden="true" />
        </IconButton>
      </section>
    ),
    { duration: 8000, closeButton: false, className: "goose-delete-receipt-toast" },
  );
}
