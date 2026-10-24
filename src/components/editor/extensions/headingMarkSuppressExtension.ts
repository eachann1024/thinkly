import { createExtension } from "@blocknote/core";
import { Plugin } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import { selectionTouchesProtectedTitle } from "../utils/documentTitlePolicy";


function headingMarkSuppressPlugin() {
  return new Plugin({
    props: {
      handleKeyDown(view: EditorView, event: KeyboardEvent): boolean {
        if (!selectionTouchesProtectedTitle(view.state)) return false;

        const mod = isPlatformPrimaryModifierEvent(event);
        if (!mod) return false;

        const key = event.key.toLowerCase();
        const shift = event.shiftKey;
        const alt = event.altKey;

        if (alt) return false;

        if (!shift && key === "b") return true;
        if (!shift && key === "i") return true;
        if (!shift && key === "u") return true;
        if (!shift && key === "e") return true;
        if (shift && key === "s") return true;

        return false;
      },
    },
  });
}

export const gooseHeadingMarkSuppressExtension = createExtension({
  key: "goose-heading-mark-suppress",
  prosemirrorPlugins: [headingMarkSuppressPlugin()],
});
