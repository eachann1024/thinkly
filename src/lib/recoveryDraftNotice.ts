import { createTranslator, i18nYaml } from "@/i18n/core";
import { toast } from "@/components/ui/sonner";
import { openRecoveryDrafts } from "@/lib/recoveryDrafts";

const uiText = createTranslator(i18nYaml<"src/lib/recoveryDraftNotice.ts#block1:1">`
zh-Hans:
  viewRecoveryDrafts: 查看恢复稿
  retryOpeningRecoveryDrafts: 重试打开恢复稿
  recoveryDraftsUnavailable: 无法加载恢复稿列表，请重试。
en:
  viewRecoveryDrafts: View recovery drafts
  retryOpeningRecoveryDrafts: Retry opening recovery drafts
  recoveryDraftsUnavailable: Couldn’t load the recovery draft list. Try again.
ja:
  viewRecoveryDrafts: 復元用下書きを表示
  retryOpeningRecoveryDrafts: 復元用下書きを再読み込み
  recoveryDraftsUnavailable: 復元用下書き一覧を読み込めませんでした。再試行してください。
`);

const activeCreateRecoveryNotices = new Map<string, number>();
let nextCreateRecoveryNotice = 0;

export function notifyRecoveryDrafts(
  message: string,
  description: string,
  id: string,
): void {
  const noticeId = id;
  const tracksCreateNotice = noticeId.startsWith("goose-local-create-recovery:");
  const generation = tracksCreateNotice ? ++nextCreateRecoveryNotice : 0;
  if (tracksCreateNotice) activeCreateRecoveryNotices.set(noticeId, generation);
  const clearCreateNotice = () => {
    if (tracksCreateNotice && activeCreateRecoveryNotices.get(noticeId) === generation) {
      activeCreateRecoveryNotices.delete(noticeId);
    }
  };
  toast.warning(message, {
    id: noticeId,
    description,
    duration: Infinity,
    ...(tracksCreateNotice ? {
      onDismiss: clearCreateNotice,
      onAutoClose: clearCreateNotice,
    } : {}),
    action: {
      label: uiText("viewRecoveryDrafts"),
      onClick: () => {
        clearCreateNotice();
        openRecoveryDrafts();
      },
    },
  });
}

export function dismissRecoveryDraftNotice(pageId: string): void {
  const id = `goose-local-create-recovery:${pageId}`;
  if (!activeCreateRecoveryNotices.has(id)) return;
  activeCreateRecoveryNotices.delete(id);
  toast.dismiss(id);
}

export function notifyRecoveryDraftsLoadFailure(): void {
  toast.error(uiText("recoveryDraftsUnavailable"), {
    duration: Infinity,
    action: { label: uiText("retryOpeningRecoveryDrafts"), onClick: openRecoveryDrafts },
  });
}
