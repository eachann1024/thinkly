import { createTranslator, i18nYaml } from "@/i18n/core";
import { toast } from "@/components/ui/sonner";
import { openRecoveryDrafts } from "@/lib/recoveryDrafts";

const uiText = createTranslator(i18nYaml<"src/lib/recoveryDraftNotice.ts#block1:1">`
zh-Hans:
  viewRecoveryDrafts: 查看恢复稿
en:
  viewRecoveryDrafts: View recovery drafts
ja:
  viewRecoveryDrafts: 復元用下書きを表示
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
