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
  helpLabel: "使用说明"
  helpTitle: "速记"
  helpIntro: "内容默认只留在当前速记。点「保存到笔记」会在当前笔记本新建一篇，并清空这张速记。"
  helpSwitch: "切换"
  helpSwitchBody: "顶部 1–5 是五个独立速记。点击或拖动切换；也可按 {{shortcuts}}。"
  helpSwitchAlternate: "{{primary}}，或 {{alternate}}"
  helpEdit: "编辑"
  helpEditBody: "{{zoomIn}} / {{zoomOut}} 缩放，{{zoomReset}} 复位；{{undo}} 撤销，{{redo}} 或 {{alternateRedo}} 重做。"
  helpSave: "保存"
  helpSaveBody: "点右上角把当前速记写入当前笔记本，保存后清空并回到空白。"
  helpDismiss: "收起"
  helpDismissBody: "小窗始终置顶；按 {{dismiss}} 或点右上角收起。草稿、位置、尺寸和缩放都会保留。"
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
  helpLabel: "How to use"
  helpTitle: "Quick Note"
  helpIntro: "Text stays in this Quick Note until you save it. Save to notes creates a page in the current notebook and clears this Quick Note."
  helpSwitch: "Switch"
  helpSwitchBody: "The numbers 1–5 are five separate notes. Click or drag to switch, or press {{shortcuts}}."
  helpSwitchAlternate: "{{primary}}, or {{alternate}}"
  helpEdit: "Edit"
  helpEditBody: "{{zoomIn}} / {{zoomOut}} zoom, {{zoomReset}} resets. {{undo}} undoes, {{redo}} or {{alternateRedo}} redoes."
  helpSave: "Save"
  helpSaveBody: "Use the button at the top right to write this note into the current notebook. It is cleared afterward."
  helpDismiss: "Hide"
  helpDismissBody: "The window stays on top. Press {{dismiss}} or the close button to hide it. The draft, position, size, and zoom are kept."
`;
const uiText = createTranslator(localMessages);
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type CSSProperties } from "react";
import { CircleAlert, FilePlus2, X } from "@/components/ui/icons";
import {
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
    helpShortcuts,
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
            <FilePlus2 className="h-3.5 w-3.5" />
          </Button>
          <Popover open={helpOpen} onOpenChange={handleHelpOpenChange}>
            <PopoverTrigger asChild>
              <Button contentStyle="preserve" variant="ghost"
                type="button"
                aria-label={uiText("helpLabel")}
                title={uiText("helpLabel")}
                className={`quicknote-titlebar-btn quicknote-help-trigger ${helpOpen ? "goose-interactive--selected" : ""}`}
                style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
              >
                <CircleAlert className="h-3.5 w-3.5" />
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
              <div className="quicknote-help-heading">
                <div className="text-sm font-medium">{uiText("helpTitle")}</div>
                <p>{uiText("helpIntro")}</p>
              </div>
              <ul className="quicknote-help-list text-muted-foreground">
                <li>
                  <b className="text-foreground">{uiText("helpSwitch")}</b>
                  ：{uiText("helpSwitchBody", {
                    shortcuts: helpShortcuts.alternateSwitchSlots
                      ? uiText("helpSwitchAlternate", {
                          primary: helpShortcuts.switchSlots,
                          alternate: helpShortcuts.alternateSwitchSlots,
                        })
                      : helpShortcuts.switchSlots,
                  })}
                </li>
                <li>
                  <b className="text-foreground">{uiText("helpEdit")}</b>
                  ：{uiText("helpEditBody", {
                    zoomIn: helpShortcuts.zoomIn,
                    zoomOut: helpShortcuts.zoomOut,
                    zoomReset: helpShortcuts.zoomReset,
                    undo: helpShortcuts.undo,
                    redo: helpShortcuts.redo,
                    alternateRedo: helpShortcuts.alternateRedo,
                  })}
                </li>
                <li>
                  <b className="text-foreground">{uiText("helpSave")}</b>
                  ：{uiText("helpSaveBody")}
                  <FilePlus2 className="mx-0.5 inline h-3.5 w-3.5 align-text-bottom" />
                </li>
                <li>
                  <b className="text-foreground">{uiText("helpDismiss")}</b>
                  ：{uiText("helpDismissBody", { dismiss: helpShortcuts.dismiss })}
                  <X className="mx-0.5 inline h-3.5 w-3.5 align-text-bottom" />
                </li>
              </ul>
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
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
