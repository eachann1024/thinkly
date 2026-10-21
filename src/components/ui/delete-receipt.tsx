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
  undoFailed: "撤回失败"
  restoreManually: "请稍后重试，或前往{{destination}}手动恢复"
  undo: "撤回"
en:
  systemTrash: "Trash"
  systemRecycle: "Recycle Bin"
  trash: "Trash"
  partialDelete: "Moved: {{done}} · Failed: {{failed}}"
  failedDelete: "Couldn’t move {{failed}}"
  deletedItem: "Moved to {{destination}} · {{title}}"
  deletedMany: "Moved to {{destination}}: {{done}}"
  undoFailed: "Couldn’t undo deletion"
  restoreManually: "Try again later, or restore the items from {{destination}}."
  undo: "Undo"
ja:
  systemTrash: "システムのゴミ箱"
  systemRecycle: "システムのごみ箱"
  trash: "ゴミ箱"
  partialDelete: "{{done}} 件を移動しました（{{failed}} 件は未完了）"
  failedDelete: "{{failed}} 件は未完了です"
  deletedItem: "{{destination}}に移動しました · {{title}}"
  deletedMany: "{{done}} 件を{{destination}}に移動しました"
  undoFailed: "元に戻せませんでした"
  restoreManually: "しばらくしてからもう一度お試しいただくか、{{destination}}から手動で復元してください"
  undo: "元に戻す"
`;
const uiText = createTranslator(localMessages);
import { RotateCcw } from "@/components/ui/icons";
import { toast } from "./sonner";

type ReceiptItem = { title: string; deleted: boolean; reason?: string };

/** One receipt for one or many deletions; undo appears only when a real restore is available. */
export function showDeleteReceipt(
  items: ReceiptItem[],
  isLocalFolder: boolean,
  onUndo?: () => void | Promise<void>,
) {
  if (!items.length) return;
  const done = items.filter((item) => item.deleted).length;
  const failed = items.length - done;
  const failureReason = items.find((item) => !item.deleted && item.reason)?.reason;
  const destination = isLocalFolder ? uiText(getPlatformKind() === "windows" ? "systemRecycle" : "systemTrash") : uiText("trash");
  let undoing = false;
  // 全部失败时直接展示具体原因；不要只说「N 项未完成」。
  const label = failed
    ? !done && failureReason
      ? failureReason
      : done ? uiText("partialDelete", {done, failed}) : uiText("failedDelete", {failed})
    : items.length === 1
      ? uiText("deletedItem", {destination, title: items[0].title})
      : uiText("deletedMany", {done, destination});

  // 标准 toast：图标、关闭按钮与其它通知共用同一套对齐；撤回成功才关闭，失败保留回执。
  let id: string | number = "";
  const action = done > 0 && onUndo ? {
    label: <><RotateCcw className="size-3.5" aria-hidden="true" />{uiText("undo")}</>,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (undoing) return;
      undoing = true;
      void (async () => {
        try {
          await onUndo();
          toast.dismiss(id);
        } catch (error) {
          toast.error(uiText("undoFailed"), { description: error instanceof Error ? error.message : uiText("restoreManually", { destination }) });
        } finally {
          undoing = false;
        }
      })();
    },
  } : undefined;
  const options = {
    duration: 8000,
    className: failed && !done && failureReason
      ? "goose-delete-receipt-toast goose-delete-failure-toast"
      : "goose-delete-receipt-toast",
    action,
  };
  id = failed ? toast.error(label, options) : toast.success(label, options);
}
