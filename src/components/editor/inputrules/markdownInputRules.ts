import { createExtension } from "@blocknote/core";
import { Plugin } from "@tiptap/pm/state";
import { jsonContentToMarkdown } from "@/lib/export/markdown/serialize";
import type { RefObject } from "react";
import type { EditorSettings } from "../platform/hostContext";

type BlockTrigger = {
  type: string;
  props: Record<string, unknown>;
  triggerText: string;
  afterTransform?: () => void;
};

export function matchCheckListTrigger(
  textBefore: string,
): { checked: boolean; triggerText: string } | null {
  const matched = /^\s?(?:\[([ xX]?)\]|【([ xX]?)】)$/u.exec(textBefore);
  if (!matched) return null;
  const mark = matched[1] ?? matched[2] ?? "";
  return {
    checked: /x/i.test(mark),
    triggerText: matched[0],
  };
}

export function matchQuoteTrigger(
  textBefore: string,
): { triggerText: string } | null {
  const matched = /^["“|｜>＞]$/u.exec(textBefore);
  if (!matched) return null;
  return { triggerText: matched[0] };
}

function getBlockTrigger(
  textBefore: string,
  editor: any,
  currentBlock: any,
): BlockTrigger | null {
  const code = /^```(.*?)$/u.exec(textBefore);
  if (code) {
    return {
      type: "codeBlock",
      props: { language: code[1].trim() || "text" },
      triggerText: code[0],
    };
  }

  const ordered = /^\s?(\d+|[ai])([.。])$/iu.exec(textBefore);
  if (ordered) {
    const start = /^\d+$/u.test(ordered[1]) ? Number.parseInt(ordered[1], 10) : 1;
    return {
      type: "numberedListItem",
      props: start === 1 ? {} : { start },
      triggerText: ordered[0],
    };
  }

  const bullet = /^\s?[-+*]$/u.exec(textBefore);
  if (bullet) {
    return { type: "bulletListItem", props: {}, triggerText: bullet[0] };
  }

  const checked = matchCheckListTrigger(textBefore);
  if (checked) {
    return {
      type: "checkListItem",
      props: { checked: checked.checked },
      triggerText: checked.triggerText,
    };
  }

  const heading = /^(#{1,3})$/u.exec(textBefore);
  if (heading) {
    return {
      type: "heading",
      props: { level: heading[1].length, isToggleable: false, collapsed: false },
      triggerText: heading[0],
    };
  }

  const quote = matchQuoteTrigger(textBefore);
  if (quote) {
    return { type: "quote", props: {}, triggerText: quote.triggerText };
  }

  return null;
}

function createMarkdownBlockTrigger(editor: any, settingsRef: RefObject<EditorSettings>) {
  return new Plugin({
    props: {
      handleTextInput(view, from, to, text) {
        if (text !== " " || from !== to) return false;

        const { state } = view;
        const $from = state.doc.resolve(from);
        const parent = $from.parent;
        if (parent.type.name !== "paragraph" && parent.type.name !== "heading") {
          return false;
        }

        const textBefore = parent.textBetween(
          0,
          $from.parentOffset,
          null,
          "￼",
        );
        const currentBlock = editor.getTextCursorPosition().block;
        const trigger = getBlockTrigger(textBefore, editor, currentBlock);
        if (!trigger) return false;
        if (trigger.type === "codeBlock") trigger.props.wrap = settingsRef.current.defaultCodeBlockWrap;

        if (parent.type.name !== "paragraph") {
          return false;
        }

        const blockPos = $from.before($from.depth);
        const targetType = state.schema.nodes[trigger.type];
        if (!targetType) return false;

        if (
          trigger.type === "codeBlock" &&
          $from.parentOffset === parent.content.size &&
          !currentBlock.children.length
        ) {
          const body: any[] = [];
          let next = editor.getNextBlock(currentBlock);
          while (next) {
            const isClosingFence =
              next.type === "paragraph" &&
              !next.children.length &&
              Array.isArray(next.content) &&
              next.content.every((item: any) => item.type === "text") &&
              /^```[ \t]*$/u.test(next.content.map((item: any) => item.text).join(""));
            if (isClosingFence) {
              const content = jsonContentToMarkdown(body);
              editor.transact(() => {
                editor.updateBlock(currentBlock, {
                  type: "codeBlock",
                  props: trigger.props,
                  content,
                });
                editor.removeBlocks([...body, next]);
                editor.setTextCursorPosition(currentBlock.id, "start");
              });
              return true;
            }
            body.push(next);
            next = editor.getNextBlock(next);
          }
        }

        const tr = state.tr;
        tr.setNodeMarkup(blockPos, targetType, {
          ...parent.attrs,
          ...trigger.props,
        });
        tr.delete(from - trigger.triggerText.length, from);
        view.dispatch(tr);
        trigger.afterTransform?.();
        return true;
      },
    },
  });
}

export function gooseMarkdownInputRulesExtension(settingsRef: RefObject<EditorSettings>) {
  return createExtension(({ editor }) => ({
  key: "goose-markdown-input-rules",
  prosemirrorPlugins: [createMarkdownBlockTrigger(editor, settingsRef)],
  }))();
}
