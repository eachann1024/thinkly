import { EditorAction } from "@/components/editor/ui/button";
import { MessageSquare } from "@/components/ui/icons";
import {
  dispatchAppendComposerSelection,
} from "@/components/editor/ai/composer/selectionQuote";

export function AddToChatButton({
  selectedText,
  pageId,
  pageTitle,
}: {
  selectedText: string;
  pageId: string;
  pageTitle: string;
}) {
  return (
    <EditorAction
      type="button"
      className="goose-formatting-toolbar-add-to-chat"
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
      <MessageSquare aria-hidden="true" />
      <span className="goose-formatting-toolbar-add-to-chat-label">
        加入对话
      </span>
    </EditorAction>
  );
}
