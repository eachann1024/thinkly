import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/quick-note/quick-note-app/renderQuickNoteHeader.tsx#localMessages:1">`
zh-Hans:
  renameSlot: "重命名速记 {{slot}}"
  renameLabel: "重命名速记"
  renameNamedLabel: "{{name}} · 重命名速记"
  saveToNotes: "保存到笔记"
  emptyNote: "速记内容为空，无法保存"
  quickNoteSettings: "速记设置"
  rename: "重命名"
  fontSize: "字号"
  pixels: "{{size}} 像素"
  clearAfterSave: "保存到笔记后，当前速记会清空。"
  close: "关闭"
en:
  renameSlot: "Rename Quick Note {{slot}}"
  renameLabel: "Rename Quick Note"
  renameNamedLabel: "{{name}} · Rename Quick Note"
  saveToNotes: "Save to notes"
  emptyNote: "This Quick Note is empty"
  quickNoteSettings: "Quick Note settings"
  rename: "Rename"
  fontSize: "Font size"
  pixels: "{{size}} pixels"
  clearAfterSave: "This Quick Note will be cleared after you save it to notes."
  close: "Close"
`;
const uiText = createTranslator(localMessages);
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
    rename,
    editRename,
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
      data-renaming={rename.phase === "editing" ? "true" : "false"}
    >
      {rename.phase === "editing" && (
        <Input variant="inline" controlSize={null}
          ref={renameInputRef}
          value={rename.value}
          maxLength={24}
          aria-label={uiText("renameSlot", {slot: rename.slot})}
          className="quicknote-slot-name-input"
          style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
          onChange={(event) => editRename(rename.id, event.target.value)}
          onBlur={() => finishRename(true, rename.id)}
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
              finishRename(true, rename.id);
            } else if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              finishRename(false, rename.id);
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
            aria-label={uiText("renameLabel")}
            title={uiText("renameNamedLabel", {name: displaySlotName})}
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
            aria-label={uiText("saveToNotes")}
            title={
              occupiedSlots[activeSlot]
                ? uiText("saveToNotes")
                : uiText("emptyNote")
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
                aria-label={uiText("quickNoteSettings")}
                title={uiText("quickNoteSettings")}
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
                <span className="min-w-0 flex-1 truncate">{uiText("rename")}</span>
                <span className="max-w-24 truncate text-muted-foreground">
                  {getQuickNoteSlotName(activeSlot, slotNames)}
                </span>
              </Button>
              <div className="quicknote-font-control">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="quicknote-font-size">{uiText("fontSize")}</label>
                  <span className="tabular-nums text-muted-foreground">
                    {Math.round(editorFontSize * zoom * 10) / 10} px
                  </span>
                </div>
                <input
                  id="quicknote-font-size"
                  type="range"
                  aria-label={uiText("fontSize")}
                  aria-valuetext={uiText("pixels", {size: Math.round(editorFontSize * zoom * 10) / 10})}
                  min={QUICKNOTE_ZOOM_MIN}
                  max={QUICKNOTE_ZOOM_MAX}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => setEditorZoom(Number(event.target.value))}
                />
              </div>
              <p className="quicknote-save-hint text-muted-foreground">
                {uiText("clearAfterSave")}</p>
            </PopoverContent>
          </Popover>
          <Button contentStyle="preserve" variant="ghost"
            type="button"
            aria-label={uiText("close")}
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
