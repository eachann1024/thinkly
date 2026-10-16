import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type CSSProperties } from "react";
import { CircleAlert, FilePlus2, X, Pencil } from "@/components/ui/icons";
import {
  getQuickNoteSlotName,
  QUICKNOTE_ZOOM_MIN,
  QUICKNOTE_ZOOM_MAX,
} from "@/stores/useQuickNote";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { QuickNoteSlotSwitcher } from "../QuickNoteSlotSwitcher";
import { isImeKeyboardEvent } from "@/hooks/useImeInput";
import type { useQuickNoteWindowPlacement } from "./useQuickNoteWindowPlacement";

export function renderQuickNoteHeader(
  context: ReturnType<typeof useQuickNoteWindowPlacement>,
) {
  const {
    activeSlot,
    helpOpen,
    savingToNote,
    renamingSlot,
    renameValue,
    setRenameValue,
    renameInputRef,
    slotNames,
    zoom,
    setEditorZoom,
    editorFontSize,
    displaySlot,
    displaySlotName,
    occupiedSlots,
    startRename,
    finishRename,
    handleSwitchSlot,
    handleHelpOpenChange,
    handleSaveToNote,
    handlePreviewSlot,
    persistPlacementThenClose,
  } = context;
  return (
    <div
      className="quicknote-titlebar-reveal-zone"
      data-renaming={renamingSlot === null ? "false" : "true"}
    >
      {renamingSlot !== null && (
        <Input variant="inline" controlSize={null}
          ref={renameInputRef}
          value={renameValue}
          maxLength={24}
          aria-label={`重命名便签 ${renamingSlot}`}
          className="quicknote-slot-name-input"
          style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
          onChange={(event) => setRenameValue(event.target.value)}
          onBlur={() => finishRename(true)}
          onKeyDown={(event) => {
            // 中文输入法按 Enter 确认候选词时不能提前提交；keyCode 229 兼容旧 Chromium。
            if (
              isImeKeyboardEvent(event.nativeEvent) ||
              isImeKeyboardEvent(event)
            ) {
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              finishRename(true);
            } else if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              finishRename(false);
            }
          }}
        />
      )}
      <div
        className="quicknote-titlebar"
        style={{ WebkitAppRegion: "drag" } as CSSProperties}
      >
        <div className="quicknote-titlebar-left">
          <Button contentStyle="preserve" variant="ghost"
            type="button"
            aria-label="修改标签名称"
            title={`${displaySlotName} · 修改标签名称`}
            className="quicknote-slot-name-display quicknote-titlebar-btn"
            style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
            onClick={() => startRename(activeSlot)}
          >
            <span
              key={`${displaySlot}-${displaySlotName}`}
              className="quicknote-slot-name-text"
            >
              {displaySlotName}
            </span>
          </Button>
        </div>

        {/* 绝对居中，避免左右内容宽度差导致视觉偏移 */}
        <div className="quicknote-slot-switcher-positioner">
          <div className="quicknote-slot-switcher-interactive">
            <QuickNoteSlotSwitcher
              activeSlot={activeSlot}
              occupiedSlots={occupiedSlots}
              slotNames={slotNames}
              onChange={handleSwitchSlot}
              onPreviewChange={handlePreviewSlot}
              onRenameRequest={startRename}
            />
          </div>
        </div>

        <div className="quicknote-titlebar-actions">
          <Button contentStyle="preserve" variant="ghost"
            type="button"
            aria-label="保存到笔记"
            title={
              occupiedSlots[activeSlot]
                ? "保存到笔记"
                : "便签内容为空，无法保存"
            }
            className="quicknote-titlebar-btn quicknote-save-btn"
            style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
            disabled={savingToNote || !occupiedSlots[activeSlot]}
            aria-busy={savingToNote}
            onClick={() => {
              void handleSaveToNote();
            }}
          >
            <FilePlus2 className="h-3 w-3" />
          </Button>
          <Popover open={helpOpen} onOpenChange={handleHelpOpenChange}>
            <PopoverTrigger asChild>
              <Button contentStyle="preserve" variant="ghost"
                type="button"
                aria-label="便签设置"
                title="便签设置"
                className={`quicknote-titlebar-btn quicknote-help-trigger ${helpOpen ? "goose-interactive--selected" : ""}`}
                style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
              >
                <CircleAlert className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              variant="menu"
              align="end"
              side="bottom"
              collisionPadding={8}
              className="quicknote-help-popover w-72 text-xs"
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              <Button contentStyle="preserve" variant="ghost"
                type="button"
                className="goose-menu-item quicknote-help-rename flex w-full items-center gap-2 text-left text-xs text-foreground"
                onClick={() => startRename(activeSlot)}
              >
                <Pencil className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">重命名</span>
                <span className="max-w-24 truncate text-muted-foreground">
                  {getQuickNoteSlotName(activeSlot, slotNames)}
                </span>
              </Button>
              <div className="quicknote-font-control">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="quicknote-font-size">字号</label>
                  <span className="tabular-nums text-muted-foreground">
                    {Math.round(editorFontSize * zoom * 10) / 10} px
                  </span>
                </div>
                <input
                  id="quicknote-font-size"
                  type="range"
                  aria-label="字号"
                  aria-valuetext={`${Math.round(editorFontSize * zoom * 10) / 10} 像素`}
                  min={QUICKNOTE_ZOOM_MIN}
                  max={QUICKNOTE_ZOOM_MAX}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => setEditorZoom(Number(event.target.value))}
                />
              </div>
              <p className="quicknote-save-hint text-muted-foreground">
                保存到笔记后，当前便签会清空。
              </p>
            </PopoverContent>
          </Popover>
          <Button contentStyle="preserve" variant="ghost"
            type="button"
            aria-label="关闭"
            className="quicknote-titlebar-btn quicknote-close-btn"
            style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
            onClick={() => persistPlacementThenClose()}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
