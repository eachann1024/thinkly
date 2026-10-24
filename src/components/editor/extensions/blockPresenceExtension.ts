import { createExtension } from "@blocknote/core";
import { Plugin, type Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { presenceName, runDomPresence } from "@/lib/ui/presence";
import { shouldAnimateBlockRemoval } from "./tableWindowModel";
import { MEDIA_KEYBOARD_DELETE_META } from "./mediaBlockDelete";

function removesBlock(tr: Transaction): boolean {
  // Keyboard deletion must commit its selection before the next key or DOM selection update.
  if (tr.getMeta(MEDIA_KEYBOARD_DELETE_META)) return false;
  const step = tr.steps[0] as { from?: number; to?: number; slice?: { size: number } } | undefined;
  if (!step || step.from == null || step.to == null || !step.slice) return false;
  const $from = tr.before.resolve(step.from);
  const $to = tr.before.resolve(step.to);
  // Text replacement must commit synchronously, even when it shortens a block.
  if ($from.sameParent($to) && $from.parent.isTextblock) return false;
  return shouldAnimateBlockRemoval({
    docChanged: tr.docChanged,
    history: tr.getMeta("addToHistory") !== false,
    stepCount: tr.steps.length,
    removed: step.to - step.from,
    inserted: step.slice.size,
    rootBlocks: tr.before.firstChild?.childCount ?? 0,
  });
}

function tagBlocks(root: HTMLElement): void {
  const outers = root.querySelectorAll<HTMLElement>(".bn-block-outer[data-id]");
  const nodes = outers.length
    ? outers
    : root.querySelectorAll<HTMLElement>(".bn-block[data-id]");
  nodes.forEach((el) => {
    const id = el.dataset.id;
    if (!id) return;
    el.style.viewTransitionName = presenceName("block", id);
  });
}

const blockPresencePlugin = new Plugin({
  view(view: EditorView) {
    const original = view.dispatch.bind(view);
    view.dispatch = (tr: Transaction) => {
      if (!removesBlock(tr)) {
        original(tr);
        return;
      }
      tagBlocks(view.dom);
      runDomPresence(() => {
        original(tr);
        tagBlocks(view.dom);
      });
    };
    return {
      destroy() {
        view.dispatch = original;
      },
    };
  },
});

export const gooseBlockPresenceExtension = createExtension({
  key: "goose-block-presence",
  prosemirrorPlugins: [blockPresencePlugin],
});
