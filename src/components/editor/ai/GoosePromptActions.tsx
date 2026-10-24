import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { EditorAction } from "@/components/editor/ui/button";
import { ArrowUp, ChevronDown, Settings } from "@/components/ui/icons";
import type { GoosePromptSuggestionMenuProps } from "./GoosePromptSuggestionMenu";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/ai/GoosePromptActions.tsx#messages:1">`
zh-Hans:
  aiQuickActions: "AI 快捷操作"
  openAiSettings: "打开 AI 设置"
  sendRewriteInstructions: "发送改写要求"
  sendEnter: "发送（回车）"
  send: "发送"
en:
  aiQuickActions: "AI quick actions"
  openAiSettings: "Open AI settings"
  sendRewriteInstructions: "Send rewrite instructions"
  sendEnter: "Send (Enter)"
  send: "Send"
ja:
  aiQuickActions: "AI クイックアクション"
  openAiSettings: "AI 設定を開く"
  sendRewriteInstructions: "書き換えの指示を送信"
  sendEnter: "送信（Enter）"
  send: "送信"
`;
const t = createTranslator(messages);


export function GoosePromptActions({
  props,
  promptTextToUse,
}: {
  props: GoosePromptSuggestionMenuProps;
  promptTextToUse: string;
}) {
  useLocale();
  const tags = props.tags ?? [];
  const disabled = props.disabled;
  const onManualPromptSubmit = props.onManualPromptSubmit;
  return (
    <div className="goose-inline-ai-footer">
      <div className="goose-ai-tags" role="group" aria-label={t("aiQuickActions")}>
        {tags.map((tag) => (
          <EditorAction
            key={tag.key}
            type="button"
            className={`goose-ai-tag${tag.key === "accept" ? " goose-inline-ai-primary" : ""}`}
            onMouseDown={(event) => {
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
            aria-label={t("openAiSettings")}
            title={t("openAiSettings")}
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
            aria-label={t("sendRewriteInstructions")}
            title={t("sendEnter")}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (promptTextToUse.trim()) onManualPromptSubmit(promptTextToUse);
            }}
          >
            {t("send")}
            <ArrowUp aria-hidden className="h-3.5 w-3.5" />
          </EditorAction>
        )}
        {props.rightSection}
      </div>
    </div>
  );
}
