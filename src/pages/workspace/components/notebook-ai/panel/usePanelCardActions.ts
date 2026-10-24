import { useLocale, createTranslator, i18nYaml } from "@/i18n";
import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import type { PartialBlock } from "@blocknote/core";
import type { EditorRef } from "@/components/editor/core/Editor";
import type { AiComposerPayload } from "@/components/editor/ai/composer/referenceLookup";
import { toast } from "@/components/ui/sonner";
import { parseAiMarkdownToBlocks } from "@/lib/notebook-ai/markdown";
import type { CardActions } from "../../ai-cards/cardActions";
import { CARD_SEND_EVENT, hasCardSend, takeCardSend } from "../cardSendQueue";
import { insertArtifactBlocks } from "../insertArtifact";

const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/panel/usePanelCardActions.ts#messages:1">`
zh-Hans:
  inserted: "已插入当前笔记"
en:
  inserted: "Inserted into current note"
ja:
  inserted: "現在のノートに挿入しました"
`;
const t = createTranslator(messages);

export function textPayload(text: string): AiComposerPayload {
  return { promptText: text, freeformText: text, references: [], images: [], skills: [], tokens: [{ type: "text", text }] };
}

type SendText = (payload: AiComposerPayload, images: []) => boolean | Promise<boolean> | unknown;

export function usePanelCardActions({ notebookId, conversationId, isBusy, ready, editorRef, sendPayload }: {
  notebookId: string;
  conversationId: string;
  isBusy: boolean;
  ready: boolean;
  editorRef?: RefObject<EditorRef | null>;
  sendPayload: SendText;
}): CardActions {
  useLocale();
  const [queueTick, setQueueTick] = useState(0);
  const send = useCallback((text: string) => { void sendPayload(textPayload(text), []); }, [sendPayload]);
  const insert = useCallback((markdown: string) => {
    const blocks = parseAiMarkdownToBlocks(markdown) as PartialBlock[];
    void insertArtifactBlocks(editorRef, blocks).then(result => {
      if (result.ok) toast.success(t("inserted"));
      else toast.error(result.error);
    });
  }, [editorRef]);

  useEffect(() => {
    const onQueued = () => setQueueTick(n => n + 1);
    window.addEventListener(CARD_SEND_EVENT, onQueued);
    return () => window.removeEventListener(CARD_SEND_EVENT, onQueued);
  }, []);

  useEffect(() => {
    if (!ready || isBusy || !hasCardSend()) return;
    const text = takeCardSend(notebookId, conversationId);
    if (text) send(text);
  }, [queueTick, ready, isBusy, notebookId, conversationId, send]);

  return useMemo(() => ({ send: ready ? send : undefined, insert, busy: isBusy }), [ready, send, insert, isBusy]);
}
