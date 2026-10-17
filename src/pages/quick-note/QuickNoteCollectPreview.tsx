import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/quick-note/QuickNoteCollectPreview.tsx#localMessages:1">`
zh-Hans:
  emptyCollection: "还没有采集内容"
  sampleClip: "模拟剪贴板片段 {{number}}"
  collected: "已收集"
  collectingCount: "自动收集中，已收集 {{count}} 条"
  collecting: "收集中"
  itemCount: "{{count}} 条"
  simulateOne: "模拟收集一条"
  simulate: "模拟收集"
  stopAutoCollect: "停止自动收集"
  stopCollect: "停止收集"
  collectionStatus: "自动收集中，已收集 {{count}} 条，最近：{{recent}}"
  stop: "停止"
en:
  emptyCollection: "Nothing collected yet"
  sampleClip: "Sample clipboard item {{number}}"
  collected: "Collected"
  collectingCount: "Auto-collecting · {{count}} collected"
  collecting: "Collecting"
  itemCount: "Items: {{count}}"
  simulateOne: "Simulate collecting an item"
  simulate: "Simulate collection"
  stopAutoCollect: "Stop auto-collecting"
  stopCollect: "Stop collecting"
  collectionStatus: "Auto-collecting · {{count}} collected · Latest: {{recent}}"
  stop: "Stop"
`;
const uiText = createTranslator(localMessages);
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardPlus, Square } from "@/components/ui/icons";
import { toast } from "@/components/ui/sonner";
import { isImeKeyboardEvent } from "@/hooks/useImeInput";
import {
  detectQuickNoteDoubleShift,
  EMPTY_DOUBLE_SHIFT_STATE,
  type DoubleShiftDetectorState,
  type QuickNoteCollectVariant,
} from "./quickNoteCollectDetector";

interface QuickNoteCollectPreviewProps {
  variant: QuickNoteCollectVariant;
}

/**
 * 采集交互的会话内原型。只维护 React state，不读取剪贴板、不写草稿或笔记。
 */
export function QuickNoteCollectPreview({
  variant,
}: QuickNoteCollectPreviewProps) {
  const detectorRef = useRef<DoubleShiftDetectorState>(
    EMPTY_DOUBLE_SHIFT_STATE,
  );
  const [enabled, setEnabled] = useState(false);
  const [count, setCount] = useState(0);
  const [recent, setRecent] = useState(uiText("emptyCollection"));

  const simulateCollect = useCallback(() => {
    setCount((previous) => {
      const next = previous + 1;
      setRecent(uiText("sampleClip", {number: next}));
      return next;
    });
    toast.success(uiText("collected"), {
      id: "quicknote-collect-preview",
      duration: 1200,
    });
  }, []);

  const stopCollecting = useCallback(() => {
    setEnabled(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isRenameInput =
        target instanceof Element &&
        target.closest(".quicknote-slot-name-input") !== null;
      if (isRenameInput) {
        detectorRef.current = EMPTY_DOUBLE_SHIFT_STATE;
        return;
      }

      const result = detectQuickNoteDoubleShift(
        detectorRef.current,
        {
          key: event.key,
          code: event.code,
          repeat: event.repeat,
          isComposing: isImeKeyboardEvent(event),
        },
        performance.now(),
      );
      detectorRef.current = result.state;
      if (!result.triggered) return;

      // 只观察按键，不改变浏览器或编辑器的默认键盘行为。
      if (variant === "copper") {
        simulateCollect();
        return;
      }
      setEnabled((current) => !current);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [simulateCollect, variant]);

  if (variant === "copper" || !enabled) return null;

  if (variant === "chip") {
    return (
      <div
        className="quicknote-collect-chip"
        data-quicknote-collect-preview="chip"
        role="status"
        aria-label={uiText("collectingCount", {count})}
      >
        <span className="quicknote-collect-pulse" aria-hidden="true" />
        <span className="quicknote-collect-chip-label">{uiText("collecting")}</span>
        <span className="quicknote-collect-count" aria-label={uiText("itemCount", {count})}>
          {count}
        </span>
        <Button contentStyle="preserve" variant="ghost"
          type="button"
          className="quicknote-collect-icon-btn"
          aria-label={uiText("simulateOne")}
          title={uiText("simulate")}
          onClick={simulateCollect}
        >
          <ClipboardPlus aria-hidden="true" />
        </Button>
        <Button contentStyle="preserve" variant="ghost"
          type="button"
          className="quicknote-collect-icon-btn quicknote-collect-stop-btn goose-interactive-danger"
          aria-label={uiText("stopAutoCollect")}
          title={uiText("stopCollect")}
          onClick={stopCollecting}
        >
          <Square aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="quicknote-collect-shelf"
      data-quicknote-collect-preview="shelf"
      role="status"
      aria-label={uiText("collectionStatus", {count, recent})}
    >
      <span className="quicknote-collect-pulse" aria-hidden="true" />
      <span className="quicknote-collect-shelf-state">{uiText("collecting")}</span>
      <span className="quicknote-collect-shelf-recent" title={recent}>
        {recent}
      </span>
      <span className="quicknote-collect-count" aria-label={uiText("itemCount", {count})}>
        {count}
      </span>
      <Button contentStyle="preserve" variant="ghost"
        type="button"
        className="quicknote-collect-simulate-btn"
        onClick={simulateCollect}
      >
        {uiText("simulate")}</Button>
      <Button contentStyle="preserve" variant="ghost"
        type="button"
        className="quicknote-collect-stop-text-btn goose-interactive-danger"
        onClick={stopCollecting}
      >
        {uiText("stop")}</Button>
    </div>
  );
}
