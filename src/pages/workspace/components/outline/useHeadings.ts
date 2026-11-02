import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/outline/useHeadings.ts#localMessages:1">`
zh-Hans:
  untitled: "无标题"
en:
  untitled: "Untitled"
ja:
  untitled: "無題"
`;
const uiText = createTranslator(localMessages);
import { useEffect, useState, useCallback } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import { transactionTouchesHeadings } from "./headingTransactions";

export interface HeadingItem {
  id: string;
  level: number;
  text: string;
  children: HeadingItem[];
}

function extractTextFromBlock(block: any): string {
  if (!block.content) return "";
  if (typeof block.content === "string") return block.content;
  if (Array.isArray(block.content)) {
    return block.content
      .map((inline: any) => {
        if (typeof inline === "string") return inline;
        if (inline?.text) return inline.text;
        return "";
      })
      .join("");
  }
  return "";
}

function collectHeadings(doc: any[]): HeadingItem[] {
  const roots: HeadingItem[] = [];
  const stack: HeadingItem[] = [];

  const visit = (block: any) => {
    if (block.type === "heading" && block.props?.level) {
      const level = block.props.level;
      if (level >= 2 && level <= 4) {
        const item: HeadingItem = {
          id: block.id,
          level,
          text: extractTextFromBlock(block) || uiText("untitled"),
          children: [],
        };

        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop();
        }

        const parent = stack[stack.length - 1];
        if (parent) {
          parent.children.push(item);
        } else {
          roots.push(item);
        }
        stack.push(item);
      }
    }
    if (block.children?.length) {
      for (const child of block.children) visit(child);
    }
  };

  for (const block of doc) visit(block);
  return roots;
}

function headingsEqual(left: HeadingItem[], right: HeadingItem[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((heading, index) => {
    const other = right[index];
    return (
      heading.id === other.id &&
      heading.level === other.level &&
      heading.text === other.text &&
      headingsEqual(heading.children, other.children)
    );
  });
}

export function useHeadings(
  editor: BlockNoteEditor | null,
  pageId?: string | null,
) {
  const locale = useLocale();
  const [headings, setHeadings] = useState<HeadingItem[]>([]);

  const refresh = useCallback(() => {
    if (!editor) {
      setHeadings([]);
      return;
    }
    const doc = editor.document as any[];
    const nextHeadings = collectHeadings(doc);
    setHeadings((current) =>
      headingsEqual(current, nextHeadings) ? current : nextHeadings,
    );
  }, [editor]);

  useEffect(() => {
    refresh();
  }, [refresh, pageId, locale]);

  useEffect(() => {
    if (!editor) return;
    const isComposing = () =>
      Boolean(
        (editor as { prosemirrorView?: { composing?: boolean } })
          .prosemirrorView?.composing,
      );
    let refreshFrame: number | null = null;
    const scheduleRefresh = () => {
      if (refreshFrame !== null) return;
      refreshFrame = requestAnimationFrame(() => {
        refreshFrame = null;
        if (!isComposing()) refresh();
      });
    };
    const tiptap = editor._tiptapEditor;
    const handleUpdate: Parameters<typeof tiptap.on<"update">>[1] = ({
      transaction,
      appendedTransactions,
    }) => {
      if (isComposing()) return;
      if (
        [transaction, ...appendedTransactions].some(transactionTouchesHeadings)
      ) {
        scheduleRefresh();
      }
    };
    tiptap.on("update", handleUpdate);
    const dom = editor.prosemirrorView?.dom;
    dom?.addEventListener("compositionend", scheduleRefresh);
    return () => {
      if (refreshFrame !== null) cancelAnimationFrame(refreshFrame);
      tiptap.off("update", handleUpdate);
      dom?.removeEventListener("compositionend", scheduleRefresh);
    };
  }, [editor, refresh, pageId]);

  return headings;
}
