import { EditorAction } from "@/components/editor/ui/button";
import { Kbd } from "@/components/editor/ui/kbd";
import { MessageSquare } from "@/components/ui/icons";
import {
  SELECTION_QUOTE_ADD_SHORTCUT,
  dispatchAppendComposerSelection,
} from "@/components/editor/ai/composer/selectionQuote";

export function AddToChatButton({
  selectedText,
  pageId,
  pageTitle,
  compact = false,
}: {
  selectedText: string;
  pageId: string;
  pageTitle: string;
  compact?: boolean;
}) {
  return (
    <EditorAction
      type="button"
      className={
        compact
          ? "goose-formatting-toolbar-control goose-formatting-toolbar-chat-icon"
          : "goose-formatting-toolbar-add-to-chat"
      }
      aria-label="将选区加入对话"
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
      {compact ? (
        <MessageSquare />
      ) : (
        <>
          <span className="goose-formatting-toolbar-add-to-chat-label">
            加入对话
          </span>
          <Kbd
            shortcut={SELECTION_QUOTE_ADD_SHORTCUT}
            className="goose-formatting-toolbar-add-to-chat-kbd"
          />
        </>
      )}
    </EditorAction>
  );
}
