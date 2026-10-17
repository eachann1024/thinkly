import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/quick-note/QuickNoteSlotSwitcher.tsx#localMessages:1">`
zh-Hans:
  occupied: "{{name}}，有内容"
  empty: "{{name}}，空白"
  switchNote: "切换速记"
  renameHint: "{{name}}；再次点击可改名"
en:
  occupied: "{{name}}, has content"
  empty: "{{name}}, empty"
  switchNote: "Switch Quick Note"
  renameHint: "{{name}}; click again to rename"
`;
const uiText = createTranslator(localMessages);
import { Button } from "@/components/ui/button";
import { type CSSProperties } from "react";
import { getQuickNoteSlotName, QUICKNOTE_SLOTS } from "@/stores/useQuickNote";
import { type QuickNoteSlotSwitcherProps } from "./slot-switcher/shared";
import { useQuickNoteSlotPreview } from "./slot-switcher/useQuickNoteSlotPreview";
import { useQuickNoteSlotInput } from "./slot-switcher/useQuickNoteSlotInput";

export function QuickNoteSlotSwitcher(props: QuickNoteSlotSwitcherProps) {
  const preview = useQuickNoteSlotPreview(props);
  const quickNoteSlotInputContext = useQuickNoteSlotInput(preview);
  const context = quickNoteSlotInputContext;
  const {
    occupiedSlots,
    slotNames,
    rootRef,
    scrubbing,
    held,
    visualSlot,
    onKeyDown,
    onPointerDown,
    onRootPointerLeave,
  } = context;

  return (
    <div
      ref={rootRef}
      className="quicknote-slot-switcher"
      data-scrubbing={scrubbing ? "true" : "false"}
      data-held={held ? "true" : "false"}
      role="radiogroup"
      data-goose-slot="choice-group"
      aria-label={uiText("switchNote")}
      style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
      onMouseLeave={onRootPointerLeave}
      onKeyDown={onKeyDown}
    >
      {QUICKNOTE_SLOTS.map((slot) => {
        const active = slot === visualSlot;
        const occupied = occupiedSlots[slot];
        const slotName = getQuickNoteSlotName(slot, slotNames);
        return (
          <Button contentStyle="preserve" variant="ghost"
            key={slot}
            type="button"
            role="radio"
            data-goose-slot="choice-row"
            aria-checked={active}
            aria-label={uiText(occupied ? "occupied" : "empty", {name: slotName})}
            title={uiText("renameHint", {name: slotName})}
            tabIndex={active ? 0 : -1}
            data-slot={slot}
            data-active={active ? "true" : "false"}
            data-selected={active || undefined}
            data-occupied={occupied ? "true" : "false"}
            className="quicknote-slot-btn"
            onPointerDown={(e) => onPointerDown(e, slot)}
            // 选择由 pointer 提交；避免 click 与拖动松手重复触发
            onClick={(e) => e.preventDefault()}
          >
            <span className="quicknote-slot-btn-label">{slot}</span>
          </Button>
        );
      })}
    </div>
  );
}
