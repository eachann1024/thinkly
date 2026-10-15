import { FormattingToolbarColorPicker } from "./ColorPicker";
import { MarkGroup } from "./groups/MarkGroup";
import { InlineGroup } from "./groups/InlineGroup";
import { LinkButton } from "./groups/LinkButton";
import { AlignGroup } from "./groups/AlignGroup";
import { AlignmentMenu } from "./groups/AlignmentMenu";
import { ListTypeGroup } from "./groups/ListTypeGroup";
import { ClearFormatButton } from "./groups/ClearFormatButton";
import { ToolbarMoreMenu } from "./ToolbarMoreMenu";
import type { ToolbarDensity } from "./useToolbarDensity";
import type { useFormattingToolbarState } from "./useFormattingToolbarState";

export function CompactToolbarGroups({
  state,
  density,
}: {
  state: ReturnType<typeof useFormattingToolbarState>;
  density: ToolbarDensity;
}) {
  const {
    caps,
    bindTooltip,
    listState,
    handleSelectionMenuOpen,
    setColorPickerOpen,
  } = state;
  const full = density === "full";
  const minimal = density === "minimal";
  const common = full || density === "compact";
  const showList =
    listState.show &&
    caps.mode !== "none" &&
    caps.mode !== "cellText" &&
    caps.mode !== "cellGrid";
  const marks = {
    isBold: state.isBold,
    isItalic: state.isItalic,
    isStrike: state.isStrike,
    bindTooltip,
  };
  const inline = {
    isUnderline: state.isUnderline,
    isCode: state.isCode,
    bindTooltip,
  };
  const link = {
    isLinkActive: state.isLinkActive,
    linkUrl: state.linkUrl,
    bindTooltip,
    onOpenChange: handleSelectionMenuOpen,
  };
  const align = {
    textAlignment: state.textAlignment,
    setTextAlignment: state.setTextAlignment,
    bindTooltip,
  };
  const primaryMarks = full
    ? (["bold", "italic", "strike"] as const)
    : common
      ? (["bold", "italic"] as const)
      : (["bold"] as const);
  const moreMarks = minimal
    ? (["bold", "italic", "strike"] as const)
    : common
      ? (["strike"] as const)
      : (["italic", "strike"] as const);
  const hasMore =
    !full &&
    (caps.showMarks ||
      caps.showClear ||
      showList ||
      (minimal && (caps.showColors || caps.showAlign)) ||
      (!common && caps.showLink));

  return (
    <>
      {caps.showMarks && !minimal && (
        <MarkGroup {...marks} items={primaryMarks} />
      )}
      {caps.showMarks && common && (
        <InlineGroup
          {...inline}
          items={full ? ["underline", "code"] : ["underline"]}
        />
      )}
      {caps.showColors && !minimal && (
        <FormattingToolbarColorPicker onOpenChange={setColorPickerOpen} />
      )}
      {caps.showLink && common && <LinkButton {...link} />}
      {caps.showAlign &&
        !minimal &&
        (full ? (
          <AlignGroup {...align} />
        ) : (
          <AlignmentMenu {...align} onOpenChange={handleSelectionMenuOpen} />
        ))}
      {showList && full && <ListTypeGroup bindTooltip={bindTooltip} />}
      {caps.showClear && full && (
        <ClearFormatButton
          onClear={state.clearFormatting}
          bindTooltip={bindTooltip}
        />
      )}
      {hasMore && (
        <ToolbarMoreMenu
          bindTooltip={bindTooltip}
          onOpenChange={handleSelectionMenuOpen}
          childMenuOpen={state.childSelectionMenuOpen}
        >
          {(runAction) => (
            <>
              {caps.showMarks && (
                <MarkGroup {...marks} items={moreMarks} runAction={runAction} />
              )}
              {caps.showMarks && (
                <InlineGroup
                  {...inline}
                  items={common ? ["code"] : ["underline", "code"]}
                  runAction={runAction}
                />
              )}
              {caps.showColors && minimal && (
                <FormattingToolbarColorPicker
                  onOpenChange={setColorPickerOpen}
                />
              )}
              {caps.showLink && !common && <LinkButton {...link} />}
              {caps.showAlign && minimal && (
                <AlignGroup
                  {...align}
                  setTextAlignment={(value) =>
                    runAction(() => state.setTextAlignment(value))
                  }
                />
              )}
              {showList && (
                <ListTypeGroup
                  bindTooltip={bindTooltip}
                  runAction={runAction}
                />
              )}
              {caps.showClear && (
                <ClearFormatButton
                  bindTooltip={bindTooltip}
                  onClear={() => runAction(state.clearFormatting)}
                />
              )}
            </>
          )}
        </ToolbarMoreMenu>
      )}
    </>
  );
}
