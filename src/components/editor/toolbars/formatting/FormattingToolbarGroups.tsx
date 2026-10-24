import { FormattingToolbarColorPicker } from "./ColorPicker";
import { MarkGroup } from "./groups/MarkGroup";
import { InlineGroup } from "./groups/InlineGroup";
import { LinkButton } from "./groups/LinkButton";
import { AlignGroup } from "./groups/AlignGroup";
import { ListTypeGroup } from "./groups/ListTypeGroup";
import { ClearFormatButton } from "./groups/ClearFormatButton";
import type { useFormattingToolbarState } from "./useFormattingToolbarState";

export function FormattingToolbarGroups({
  state,
}: {
  state: ReturnType<typeof useFormattingToolbarState>;
}) {
  const { caps, bindTooltip, listState, handleSelectionMenuOpen } = state;
  const showList =
    listState.show &&
    caps.mode !== "none" &&
    caps.mode !== "cellText" &&
    caps.mode !== "cellGrid";

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
        </div>
      )}
      {(caps.showColors || caps.showLink) && (
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
      {(showList || caps.showClear) && (
        <div className="goose-formatting-toolbar-group">
          {showList && <ListTypeGroup bindTooltip={bindTooltip} />}
          {caps.showClear && (
            <ClearFormatButton onClear={state.clearFormatting} bindTooltip={bindTooltip} />
          )}
        </div>
      )}
    </>
  );
}
