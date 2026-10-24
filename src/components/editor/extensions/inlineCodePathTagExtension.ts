import { createExtension } from "@blocknote/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import {
  isAbsoluteLocalPath,
  isInsideRoot,
  peekProbe,
  probePath,
  resolveCandidatePath,
  toOpenTarget,
} from "@/components/editor/inline-code/localPathTarget";
import { subscribeModifierClass } from "./modifierClassSubscription";

export type InlineCodePathTagDeps = {
  getPageLocalFilePath: () => string | null;
  getLocalFolderRoot: () => string | null;
  existsAsync: (path: string) => Promise<boolean>;
  isFsAvailable: () => boolean;
  openPath: (rawText: string) => void;
};

type PathTagState = {
  decorations: DecorationSet;
};

const pathTagKey = new PluginKey<PathState>("goose-inline-code-path-tag");
type PathState = PathTagState;

const ARMED_CLASS = "goose-inline-code-path-armed";
const RESCAN_DEBOUNCE_MS = 200;

function collectCodeRanges(doc: PMNode): Array<{ from: number; to: number; text: string }> {
  const codeType = doc.type.schema.marks.code;
  if (!codeType) return [];
  const ranges: Array<{ from: number; to: number; text: string }> = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    if (!codeType.isInSet(node.marks)) return;
    const last = ranges[ranges.length - 1];
    if (last && last.to === pos) {
      last.to = pos + node.text.length;
      last.text += node.text;
    } else {
      ranges.push({ from: pos, to: pos + node.text.length, text: node.text });
    }
  });
  return ranges;
}

function buildDecorations(
  doc: PMNode,
  deps: InlineCodePathTagDeps,
  onSettled: () => void,
): DecorationSet {
  const pagePath = deps.getPageLocalFilePath();
  const root = deps.getLocalFolderRoot();
  if (!deps.isFsAvailable()) return DecorationSet.empty;
  const decorations: Decoration[] = [];
  for (const range of collectCodeRanges(doc)) {
    const target = toOpenTarget(range.text);
    if (!target) continue;
    const absolute = isAbsoluteLocalPath(range.text);
    if (!absolute && (!pagePath || !root)) continue;
    const absPath = resolveCandidatePath(target, pagePath ?? "/");
    if (!absPath) continue;
    if (!absolute && (!root || !isInsideRoot(absPath, root))) continue;
    const state = peekProbe(absPath);
    if (state === "hit") {
      decorations.push(
        Decoration.inline(range.from, range.to, {
          class: "goose-inline-code-path",
        }),
      );
    } else if (state === "unknown") {
      probePath(absPath, deps.existsAsync, onSettled);
    }
  }
  return DecorationSet.create(doc, decorations);
}

function createPathTagPlugin(deps: InlineCodePathTagDeps) {
  return new Plugin<PathState>({
    key: pathTagKey,
    state: {
      init: () => ({ decorations: DecorationSet.empty }),
      apply(tr: Transaction, prev: PathState): PathState {
        const meta = tr.getMeta(pathTagKey) as
          | { decorations: DecorationSet }
          | undefined;
        if (meta) return { decorations: meta.decorations };
        if (tr.docChanged) {
          return { decorations: prev.decorations.map(tr.mapping, tr.doc) };
        }
        return prev;
      },
    },
    props: {
      decorations(state: EditorState) {
        return pathTagKey.getState(state)?.decorations ?? null;
      },
      handleClick(view: EditorView, _pos: number, event: MouseEvent): boolean {
        if (!isPlatformPrimaryModifierEvent(event)) return false;
        const target = event.target as HTMLElement | null;
        const tag = target?.closest<HTMLElement>(".goose-inline-code-path");
        if (!tag) return false;
        const rawText = tag.textContent?.trim() ?? "";
        if (!rawText) return false;
        const openTarget = toOpenTarget(rawText);
        if (!openTarget) return false;
        event.preventDefault();
        deps.openPath(openTarget);
        return true;
      },
    },
    view(view: EditorView) {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let destroyed = false;
      let lastPagePath = deps.getPageLocalFilePath();
      let lastFolderRoot = deps.getLocalFolderRoot();

      const scheduleRescan = () => {
        if (destroyed) return;
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          if (destroyed) return;
          const decorations = buildDecorations(
            view.state.doc,
            deps,
            scheduleRescan,
          );
          view.dispatch(
            view.state.tr
              .setMeta(pathTagKey, { decorations })
              .setMeta("addToHistory", false),
          );
        }, RESCAN_DEBOUNCE_MS);
      };

      scheduleRescan();

      const unsubscribeModifierClass = subscribeModifierClass(view.dom, ARMED_CLASS);

      return {
        update(view: EditorView, prevState: EditorState) {
          const nextPagePath = deps.getPageLocalFilePath();
          const nextFolderRoot = deps.getLocalFolderRoot();
          if (
            view.state.doc !== prevState.doc ||
            nextPagePath !== lastPagePath ||
            nextFolderRoot !== lastFolderRoot
          ) {
            lastPagePath = nextPagePath;
            lastFolderRoot = nextFolderRoot;
            scheduleRescan();
          }
        },
        destroy() {
          destroyed = true;
          if (timer !== null) clearTimeout(timer);
          unsubscribeModifierClass();
        },
      };
    },
  });
}

export function createInlineCodePathTagExtension(deps: InlineCodePathTagDeps) {
  return createExtension({
    key: "goose-inline-code-path-tag",
    runsBefore: ["goose-inline-code-caret"],
    prosemirrorPlugins: [createPathTagPlugin(deps)],
  });
}
