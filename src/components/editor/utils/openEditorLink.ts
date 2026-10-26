import type { BlockNoteEditor } from "@blocknote/core";
import type { EditorPageContext } from "../platform/hostContext";
import type { EditorPlatform } from "../platform/types";
import { createTranslator } from "@/i18n";
import { toast } from "@/components/ui/sonner";
import messages from "./openEditorLink.messages.yaml";
import { resolveEditorLink } from "./editorLinkTarget";
import { scrollToEditorLinkAnchor } from "./editorLinkAnchor";

const t = createTranslator(messages);
export function reportEditorLinkFailure(): void {
  toast.error(t("couldNotOpenLink"));
}

export async function openEditorLink(
  url: string,
  editor: BlockNoteEditor<any, any, any> | null,
  platform: EditorPlatform,
  context: Pick<EditorPageContext, "getActivePageLocalFilePath" | "onOpenLocalLink">,
): Promise<void> {
  try {
    const target = resolveEditorLink(url, context.getActivePageLocalFilePath());
    if (target.kind === "external") {
      await platform.shell.openUrl(target.url);
      return;
    }
    if (target.kind === "anchor" && editor && scrollToEditorLinkAnchor(editor, target.fragment)) return;
    if (target.kind === "local" && await context.onOpenLocalLink?.(target.path, target.fragment)) return;
  } catch {
  }
  reportEditorLinkFailure();
}
