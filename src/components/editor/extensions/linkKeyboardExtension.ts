import { createExtension } from "@blocknote/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { getEditorPlatform } from "@/components/editor/platform/context";
import { isImeKeyboardEvent } from "@/hooks/useImeInput";
import {
  isPlatformPrimaryModifierEvent,
  normalizeShortcutForConflict,
} from "@/lib/shortcut-platform";
import { getPlatformKind, type PlatformKind } from "@/lib/utils";
import { useSettings } from "@/stores/useSettings";
import { subscribeModifierClass } from "./modifierClassSubscription";

export const LINK_ARMED_CLASS = "goose-link-armed";

export function shouldArmLinkOpenHint(
  event: Pick<KeyboardEvent | MouseEvent, "metaKey" | "ctrlKey">,
): boolean {
  return isPlatformPrimaryModifierEvent(event);
}

type LinkShortcutEvent = Pick<
  KeyboardEvent,
  | "key"
  | "code"
  | "ctrlKey"
  | "metaKey"
  | "altKey"
  | "shiftKey"
  | "repeat"
  | "defaultPrevented"
> &
  Partial<Pick<KeyboardEvent, "isComposing" | "keyCode" | "which">> & {
    nativeEvent?: Pick<KeyboardEvent, "isComposing" | "keyCode" | "which">;
  };

export function isPrimaryLinkShortcutEvent(
  event: LinkShortcutEvent,
  platform: PlatformKind = getPlatformKind(),
) {
  return (
    !event.defaultPrevented &&
    !isImeKeyboardEvent(event.nativeEvent ?? {}) &&
    !isImeKeyboardEvent(event) &&
    !event.repeat &&
    !event.altKey &&
    !event.shiftKey &&
    isPlatformPrimaryModifierEvent(event, platform) &&
    (event.key.toLowerCase() === "k" || event.code === "KeyK")
  );
}

export function isLinkShortcutClaimedByApp(
  shortcuts: Iterable<string | undefined>,
  platform: PlatformKind = getPlatformKind(),
) {
  const link = normalizeShortcutForConflict("Mod+K", platform);
  for (const shortcut of shortcuts) {
    if (!shortcut) continue;
    if (normalizeShortcutForConflict(shortcut, platform) === link) return true;
  }
  return false;
}

function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

const linkArmedPluginKey = new PluginKey("goose-link-armed");

function createLinkArmedPlugin() {
  return new Plugin({
    key: linkArmedPluginKey,
    view(view: EditorView) {
      return {
        destroy: subscribeModifierClass(view.dom, LINK_ARMED_CLASS, shouldArmLinkOpenHint),
      };
    },
  });
}

export const createGooseLinkKeyboardExtension = () =>
  createExtension({
    key: "goose-link-keyboard",
    prosemirrorPlugins: [createLinkArmedPlugin()],
    keyboardShortcuts: {
      "Mod-k": ({ editor }) => {
        const settings = useSettings.getState();
        if (
          isLinkShortcutClaimedByApp([
            ...Object.values(settings.appShortcuts),
            settings.closeTabShortcut,
            settings.searchPanelCloseShortcut,
          ])
        ) {
          return false;
        }
        const url = editor.getSelectedLinkUrl();
        if (url) {
          editor.deleteLink();
          return true;
        }
        const selectedText = editor.getSelectedText();
        if (selectedText) {
          document.dispatchEvent(new CustomEvent("goose-open-link-popover"));
          return true;
        }
        return false;
      },
      "Alt-Enter": ({ editor }) => {
        const url = editor.getSelectedLinkUrl();
        if (url) {
          const target = normalizeExternalUrl(url);
          if (target) {
            void getEditorPlatform().shell.openUrl(
              target,
            );
          }
          return true;
        }
        return false;
      },
    },
  });
