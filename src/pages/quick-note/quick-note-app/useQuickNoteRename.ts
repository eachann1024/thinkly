import { useCallback, useEffect, useReducer, useRef } from "react";
import { getQuickNoteSlotName, persistQuickNoteSlotNames, updateQuickNoteSlotName, type QuickNoteSlot } from "@/stores/useQuickNote";
import type { useQuickNoteDraftState } from "./useQuickNoteDraftState";
import { transitionQuickNoteRename, type QuickNoteRenameEvent, type QuickNoteRenameState } from "./quickNoteRenameState";

type Input = Pick<ReturnType<typeof useQuickNoteDraftState>, "editorRef" | "slotNamesRef" | "setSlotNames" | "setHelpOpen">;
export function useQuickNoteRename({ editorRef, slotNamesRef, setSlotNames, setHelpOpen }: Input, flushEditor: () => void) {
  const [rename, dispatch] = useReducer(transitionQuickNoteRename, { phase: "idle" });
  // 同步事务镜像使 Enter 后紧随的 blur 读取 finishing，而非上次 render 的 editing。
  const renameRef = useRef<QuickNoteRenameState>(rename);
  const sequence = useRef(0);
  const frame = useRef(0);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const send = useCallback((event: QuickNoteRenameEvent) => {
    renameRef.current = transitionQuickNoteRename(renameRef.current, event);
    dispatch(event);
  }, []);
  const startRename = useCallback((slot: QuickNoteSlot) => {
    cancelAnimationFrame(frame.current);
    flushEditor();
    setHelpOpen(false);
    send({ type: "started", id: ++sequence.current, slot,
      value: getQuickNoteSlotName(slot, slotNamesRef.current) });
  }, [flushEditor, send, setHelpOpen, slotNamesRef]);
  const finishRename = useCallback((save: boolean, id: number) => {
    const transaction = renameRef.current;
    if (transaction.phase !== "editing" || transaction.id !== id) return;
    send({ type: "finish-requested", id: transaction.id });
    cancelAnimationFrame(frame.current);
    if (save) {
      const next = updateQuickNoteSlotName(slotNamesRef.current, transaction.slot, transaction.value);
      if (next !== slotNamesRef.current) {
        slotNamesRef.current = next;
        setSlotNames(next);
        persistQuickNoteSlotNames(next);
      }
    }
    frame.current = requestAnimationFrame(() => {
      if (renameRef.current.phase !== "finishing" || renameRef.current.id !== transaction.id) return;
      send({ type: "focus-returned", id: transaction.id });
      editorRef.current?.editor?.focus?.();
    });
  }, [editorRef, send, setSlotNames, slotNamesRef]);
  const editingId = rename.phase === "editing" ? rename.id : null;
  useEffect(() => {
    if (editingId === null) return;
    const focusFrame = requestAnimationFrame(() => {
      if (renameRef.current.phase !== "editing" || renameRef.current.id !== editingId) return;
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
    return () => cancelAnimationFrame(focusFrame);
  }, [editingId]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return { rename, renameInputRef, startRename, finishRename,
    editRename: (id: number, value: string) => send({ type: "edited", id, value }) };
}
