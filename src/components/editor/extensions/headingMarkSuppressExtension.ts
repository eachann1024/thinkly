import { createExtension } from "@blocknote/core";
import { Plugin } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import { selectionTouchesProtectedTitle } from "../utils/documentTitlePolicy";

/**
 * 仅在 normalized 页面首标题内禁用字符级样式快捷键；普通 heading 与 raw 首标题放行：
 * bold (Mod+B) / italic (Mod+I) / underline (Mod+U) / code (Mod+E) / strike (Mod+Shift+S)。
 *
 * 为什么用 ProseMirror handleKeyDown 而非 tiptap keymap：
 * BlockNote 的 bold/italic/underline/strike/code 快捷键来自 tiptap 内置
 * Bold / Italic 等 extension 的 addKeyboardShortcuts()，这些 shortcuts 在
 * tiptap 层通过 prosemirror-keymap 插件注册。ProseMirror 的 handleKeyDown
 * 是视图级 prop，比所有 prosemirror-keymap 插件都早执行——只要在此返回
 * true（吞掉事件），tiptap 内置快捷键永远收不到该按键，拦截确定性最强。
 */

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

        // bold:      Mod+B
        if (!shift && key === "b") return true;
        // italic:    Mod+I
        if (!shift && key === "i") return true;
        // underline: Mod+U
        if (!shift && key === "u") return true;
        // code:      Mod+E
        if (!shift && key === "e") return true;
        // strike:    Mod+Shift+S
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
