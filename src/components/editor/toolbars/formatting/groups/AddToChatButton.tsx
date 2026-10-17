import { EditorAction } from "@/components/editor/ui/button";
import { MessageSquare } from "@/components/ui/icons";
import { Tooltip, TooltipTrigger } from "@/components/editor/ui/tooltip";
import { ToolbarTooltip, type BindTooltip } from "../ToolbarTooltip";
import {
  dispatchAppendComposerSelection,
  SELECTION_QUOTE_ADD_SHORTCUT,
} from "@/components/editor/ai/composer/selectionQuote";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/toolbars/formatting/groups/AddToChatButton.tsx#messages:1">`
zh-Hans:
  addSelectionToChat: "将选区加入对话"
  addToChat: "加入对话"
en:
  addSelectionToChat: "Add selection to chat"
  addToChat: "Add to chat"
`;
const t = createTranslator(messages);


export function AddToChatButton({
  selectedText,
  pageId,
  pageTitle,
  bindTooltip,
}: {
  selectedText: string;
  pageId: string;
  pageTitle: string;
  bindTooltip: BindTooltip;
}) {
  return (
    <Tooltip {...bindTooltip("add-to-chat")}>
      <TooltipTrigger asChild>
        <EditorAction
          type="button"
          className="goose-formatting-toolbar-add-to-chat"
          aria-label={t("addSelectionToChat")}
          aria-keyshortcuts="Control+Shift+U Meta+Shift+U"
          onClick={() => {
            dispatchAppendComposerSelection({
              pageId,
              pageTitle,
              text: selectedText,
              animate: true,
            });
          }}
        >
          <MessageSquare aria-hidden="true" />
          <span className="goose-formatting-toolbar-add-to-chat-label">
            {t("addToChat")}
          </span>
        </EditorAction>
      </TooltipTrigger>
      <ToolbarTooltip label={t("addSelectionToChat")} shortcut={SELECTION_QUOTE_ADD_SHORTCUT} />
    </Tooltip>
  );
}
