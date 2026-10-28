import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/quick-note/quick-note-app/renderQuickNoteHeader.tsx#localMessages:1">`
zh-Hans:
  renameSlot: "重命名速记 {{slot}}"
  saveToNotes: "保存到笔记"
  emptyNote: "速记内容为空，无法保存"
  close: "关闭"
  helpLabel: "使用说明"
  helpTitle: "速记"
en:
  renameSlot: "Rename Quick Note {{slot}}"
  saveToNotes: "Save to notes"
  emptyNote: "This Quick Note is empty"
  close: "Close"
  helpLabel: "How to use"
  helpTitle: "Quick Note"
ja:
  renameSlot: "クイックノート {{slot}} の名前を変更"
  saveToNotes: "ノートに保存"
  emptyNote: "クイックノートが空のため、保存できません"
  close: "閉じる"
  helpLabel: "使い方"
  helpTitle: "クイックノート"
`;
const uiText = createTranslator(localMessages);
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type CSSProperties } from "react";
import { CircleAlert, FilePlus2, X } from "@/components/ui/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { QuickNoteSlotSwitcher } from "../QuickNoteSlotSwitcher";
import { isImeKeyboardEvent } from "@/hooks/useImeInput";
import { getPlatformKind } from "@/lib/utils";
import { quickNoteHelpLines } from "../quickNoteHelpCopy";
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
    displaySlotName,
    windowTitle,
    occupiedSlots,
    startRename,
    finishRename,
    handleSwitchSlot,
    handleHelpOpenChange,
    handleSaveToNote,
    handlePreviewSlot,
    persistPlacementThenClose,
  } = context;
  const displayTitle = displaySlotName;
  const helpLines = quickNoteHelpLines(getPlatformKind());
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
          <button
            type="button"
            className="quicknote-slot-name-display"
            title={displayTitle}
            aria-label={uiText("renameSlot", { slot: activeSlot })}
            data-notebook-window-title={windowTitle}
            style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
            onClick={() => startRename(activeSlot)}
          >
            <span key={displayTitle} className="quicknote-slot-name-text">
              {displayTitle}
            </span>
          </button>
        </div>

        { }
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
                className="quicknote-titlebar-btn quicknote-help-trigger"
                data-goose-selected="false"
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
              className="quicknote-help-popover w-72"
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              <div className="quicknote-help-heading">
                <div className="quicknote-help-title font-medium">{uiText("helpTitle")}</div>
                <ol className="quicknote-help-list goose-tabular">
                  {helpLines.map((line, index) => <li key={index}>{line}</li>)}
                </ol>
              </div>
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
