import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/bootstrap/assertQuickNoteSaved.ts#localMessages:1">`
zh-Hans:
  unsavedQuickNote: "速记草稿尚未保存，请在小窗重试保存后更新"
en:
  unsavedQuickNote: "Your Quick Note draft hasn’t been saved. Try saving it in the Quick Note window before updating."
ja:
  unsavedQuickNote: "クイックノートの下書きが保存されていません。ミニウィンドウで保存をやり直してからアップデートしてください"
`;
const uiText = createTranslator(localMessages);
import type { JSONContent } from "@/types";
import type { QuickNoteSlot } from "@/stores/quicknote/types";

export async function assertQuickNoteSaved(): Promise<void> {
  if (!window.location.pathname.endsWith("/quicknote.html")) return;
  const [quickNote, recovery, storage, content] = await Promise.all([
    import("@/stores/useQuickNote"),
    import("@/stores/quicknote/recovery"),
    import("@/lib/storage"),
    import("@/components/editor/utils/blocknote-content"),
  ]);
  const current = quickNote.useQuickNote.getState().drafts;
  let persisted: Partial<Record<QuickNoteSlot, JSONContent | null>> = {};
  try {
    const raw = storage.getDbStorageItem("thinkly:quicknote");
    if (raw) persisted = JSON.parse(raw)?.state?.drafts ?? {};
  } catch {
  }
  const slots = new Set([
    ...quickNote.QUICKNOTE_SLOTS,
    ...recovery.pendingQuickNoteRecoveryRevisions.keys(),
  ]);
  for (const slot of slots) {
    const draft = current[slot] ?? null;
    const saved = persisted[slot] ?? null;
    if (quickNote.isQuickNoteDraftEmpty(draft) && quickNote.isQuickNoteDraftEmpty(saved)) continue;
    if (content.getContentSignature(draft) !== content.getContentSignature(saved)) {
      throw new Error(uiText("unsavedQuickNote"));
    }
  }
}
