import { FormattingToolbarColorPicker } from "./ColorPicker";
import { MarkGroup } from "./groups/MarkGroup";
import { InlineGroup } from "./groups/InlineGroup";
import { LinkButton } from "./groups/LinkButton";
import { AlignGroup } from "./groups/AlignGroup";
import { ClearFormatButton } from "./groups/ClearFormatButton";
import type { useFormattingToolbarState } from "./useFormattingToolbarState";

export function FormattingToolbarGroups({
  state,
}: {
  state: ReturnType<typeof useFormattingToolbarState>;
}) {
  const { caps, bindTooltip, handleSelectionMenuOpen } = state;
  // Clear formatting rides along with the marks group; when marks are hidden
  // (protected title), it falls back to the color/link group.
  const clearButton = caps.showClear ? (
    <ClearFormatButton onClear={state.clearFormatting} bindTooltip={bindTooltip} />
  ) : null;
  const clearInMarks = caps.showMarks;

  return (
    <>
      {caps.showMarks && (
        <div className="goose-formatting-toolbar-group">
          <MarkGroup
            isBold={state.isBold}
            isItalic={state.isItalic}
            isStrike={state.isStrike}
            bindTooltip={bindTooltip}
          />
          <InlineGroup
            isUnderline={state.isUnderline}
            isCode={state.isCode}
            bindTooltip={bindTooltip}
          />
          {clearButton}
        </div>
      )}
      {(caps.showColors || caps.showLink || (!clearInMarks && clearButton)) && (
        <div className="goose-formatting-toolbar-group">
          {caps.showColors && (
            <FormattingToolbarColorPicker onOpenChange={state.setColorPickerOpen} />
          )}
          {caps.showLink && (
            <LinkButton
              isLinkActive={state.isLinkActive}
              linkUrl={state.linkUrl}
              bindTooltip={bindTooltip}
              onOpenChange={handleSelectionMenuOpen}
            />
          )}
          {!clearInMarks && clearButton}
        </div>
      )}
      {caps.showAlign && (
        <div className="goose-formatting-toolbar-group">
          <AlignGroup
            textAlignment={state.textAlignment}
            setTextAlignment={state.setTextAlignment}
            bindTooltip={bindTooltip}
          />
        </div>
      )}
    </>
  );
}
