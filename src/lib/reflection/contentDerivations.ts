import type { JSONContent } from "@/types";
import { getContentSignature } from "@/components/editor/utils/blocknote-content";
import { countWordsInText, extractTextFromContent } from "@/components/editor/utils/content-text-extractor";

interface ContentDerivations {
  readonly text: string;
  readonly wordCount: number;
  readonly textSignature: string;
  readonly recoverySignature: string;
}

const cache = new WeakMap<object, ContentDerivations>();

function derive(content: JSONContent): ContentDerivations {
  let text: string | undefined;
  let wordCount: number | undefined;
  let textSignature: string | undefined;
  let recoverySignature: string | undefined;
  return {
    get text() { return text ??= extractTextFromContent(content); },
    get wordCount() { return wordCount ??= countWordsInText(this.text); },
    get textSignature() {
      if (textSignature === undefined) {
        const value = this.text;
        let hash = 2166136261;
        for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
        textSignature = `${value.length}:${hash >>> 0}`;
      }
      return textSignature;
    },
    get recoverySignature() { return recoverySignature ??= getContentSignature(content ?? null); },
  };
}

// Page bodies are immutable snapshots. Weak keys retain only revisions that
// still have consumers, and each derived value is computed only on demand.
export function getContentDerivations(content: JSONContent): ContentDerivations {
  if (!content || typeof content !== "object") return derive(content);
  let value = cache.get(content);
  if (!value) {
    value = derive(content);
    cache.set(content, value);
  }
  return value;
}
