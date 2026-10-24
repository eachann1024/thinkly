import { useEffect, useMemo, useRef, useState } from "react";
import {
  useQuickNote,
  buildQuickNoteDraftPage,
  getQuickNoteSlotName,
  loadQuickNoteSlotNames,
  QUICKNOTE_SLOTS,
  isQuickNoteDraftEmpty,
  type QuickNoteSlot,
} from "@/stores/useQuickNote";
import { type EditorRef } from "@/components/editor/core/Editor";
import { getQuickNoteCollectVariant } from "../quickNoteCollectDetector";
import { useSettings } from "@/stores/settings";
import {
  computeEditorUiScale,
  EDITOR_UI_SCALE_CHANGE_EVENT,
} from "@/lib/appearance";

export function useQuickNoteDraftState() {
  const editorRef = useRef<EditorRef>(null);

  const collectVariant = useMemo(
    () => getQuickNoteCollectVariant(window.location.search),
    [],
  );

  const restoredContentSignatureRef = useRef<{
    slot: QuickNoteSlot;
    signature: string;
  } | null>(null);

  const activeSlot = useQuickNote((s) => s.activeSlot);

  const drafts = useQuickNote((s) => s.drafts);

  const setActiveSlot = useQuickNote((s) => s.setActiveSlot);

  const setDraftContent = useQuickNote((s) => s.setDraftContent);

  const undoDraft = useQuickNote((s) => s.undoDraft);

  const redoDraft = useQuickNote((s) => s.redoDraft);

  const setWindowSize = useQuickNote((s) => s.setWindowSize);

  const setWindowPosition = useQuickNote((s) => s.setWindowPosition);

  const setEditorZoom = useQuickNote((s) => s.setEditorZoom);

  const zoom = useQuickNote((s) => s.editorZoom);

  const editorFontSize = useSettings((s) => s.editorFontSize);

  const editorLineHeight = useSettings((s) => s.editorLineHeight);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--editor-line-height",
      String(editorLineHeight),
    );
  }, [editorLineHeight]);

  useEffect(() => {
    const root = document.documentElement;
    const scale = computeEditorUiScale(editorFontSize, zoom);
    if (root.style.getPropertyValue("--editor-ui-scale") === scale) return;
    root.style.setProperty("--editor-ui-scale", scale);
    window.dispatchEvent(
      new CustomEvent(EDITOR_UI_SCALE_CHANGE_EVENT, {
        detail: { scale },
      }),
    );
  }, [editorFontSize, zoom]);

  const [historyEpoch, setHistoryEpoch] = useState(0);

  const [previewSlot, setPreviewSlot] = useState<QuickNoteSlot | null>(null);

  const [helpOpen, setHelpOpen] = useState(false);

  const [savingToNote, setSavingToNote] = useState(false);

  const [slotNames, setSlotNames] = useState(() =>
    loadQuickNoteSlotNames(useQuickNote.getState().slotNames),
  );

  const slotNamesRef = useRef(slotNames);

  const displaySlot = previewSlot ?? activeSlot;

  const displaySlotName = getQuickNoteSlotName(displaySlot, slotNames);

  const occupiedSlots = useMemo(
    () =>
      Object.fromEntries(
        QUICKNOTE_SLOTS.map((slot) => [
          slot,
          !isQuickNoteDraftEmpty(drafts[slot] ?? null),
        ]),
      ) as Record<QuickNoteSlot, boolean>,
    [drafts],
  );

  const draftPage = useMemo(
    () => buildQuickNoteDraftPage(drafts[displaySlot] ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displaySlot, historyEpoch],
  );

  const isResizingRef = useRef(false);

  const resizeSettleTimerRef = useRef<number | null>(null);
  return {
    editorRef,
    collectVariant,
    restoredContentSignatureRef,
    activeSlot,
    drafts,
    setActiveSlot,
    setDraftContent,
    undoDraft,
    redoDraft,
    setWindowSize,
    setWindowPosition,
    setEditorZoom,
    zoom,
    editorFontSize,
    editorLineHeight,
    historyEpoch,
    setHistoryEpoch,
    previewSlot,
    setPreviewSlot,
    helpOpen,
    setHelpOpen,
    savingToNote,
    setSavingToNote,
    slotNames,
    setSlotNames,
    slotNamesRef,
    displaySlot,
    displaySlotName,
    occupiedSlots,
    draftPage,
    isResizingRef,
    resizeSettleTimerRef,
  };
}
