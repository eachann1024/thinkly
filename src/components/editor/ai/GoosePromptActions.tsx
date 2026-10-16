import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { EditorAction } from "@/components/editor/ui/button";
import { ArrowUp, ChevronDown, Settings } from "@/components/ui/icons";
import type { GoosePromptSuggestionMenuProps } from "./GoosePromptSuggestionMenu";

export function GoosePromptActions({
  props,
  promptTextToUse,
}: {
  props: GoosePromptSuggestionMenuProps;
  promptTextToUse: string;
}) {
  const tags = props.tags ?? [];
  const disabled = props.disabled;
  const onManualPromptSubmit = props.onManualPromptSubmit;
  return (
    <div className="goose-inline-ai-footer">
      <div className="goose-ai-tags" role="group" aria-label="AI 快捷操作">
        {tags.map((tag) => (
          <EditorAction
            key={tag.key}
            type="button"
            className={`goose-ai-tag${tag.key === "accept" ? " goose-inline-ai-primary" : ""}`}
            onMouseDown={(event) => {
              // 避免 mousedown 抢走 textarea 焦点导致浮层抖动
              event.preventDefault();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              tag.onClick();
            }}
          >
            {tag.label}
          </EditorAction>
        ))}
        {props.actionMenus?.map((menu) => (
          <DropdownMenu key={menu.label}>
            <DropdownMenuTrigger asChild>
              <EditorAction className="goose-ai-tag inline-flex items-center gap-1">
                {menu.label}
                <ChevronDown aria-hidden className="h-3 w-3" />
              </EditorAction>
            </DropdownMenuTrigger>
            <DropdownMenuContent variant="menu">
              {menu.actions.map((action) => (
                <DropdownMenuItem key={action.key} onSelect={action.onClick}>
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      </div>
      <div className="goose-inline-ai-submit-actions">
        {props.showPlus && props.onOpenAiPanel && (
          <EditorAction
            type="button"
            className="goose-ai-tag goose-ai-tag--plus"
            aria-label="打开 AI 设置"
            title="打开 AI 设置"
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              props.onOpenAiPanel?.();
            }}
          >
            <Settings className="h-3.5 w-3.5" strokeWidth={1.75} />
          </EditorAction>
        )}
        {props.showSubmit && (
          <EditorAction
            type="button"
            className={`goose-inline-ai-send${tags.some((tag) => tag.key === "accept") ? "" : " goose-inline-ai-primary"}`}
            disabled={disabled || !promptTextToUse.trim()}
            aria-label="发送改写要求"
            title="发送（回车）"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (promptTextToUse.trim()) onManualPromptSubmit(promptTextToUse);
            }}
          >
            发送
            <ArrowUp aria-hidden className="h-3.5 w-3.5" />
          </EditorAction>
        )}
        {props.rightSection}
      </div>
    </div>
  );
}
