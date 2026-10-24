import { useLocale } from "@/i18n";
import { useEffect, type RefObject } from "react";
import type { AiComposerInputHandle } from "@/components/editor/ai/composer/AiComposerInput";
import { toast } from "@/components/ui/sonner";
import { REFINE_PLAN_EVENT, takePendingRefinement, type RefinePlanRequest } from "./refinePlan";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/approval/usePlanRefinementInput.ts#messages:1">`
zh-Hans:
  theInputIsTemporarilyUnavailableTryRefiningThe: "输入框暂不可用，请稍后调整方案。"
en:
  theInputIsTemporarilyUnavailableTryRefiningThe: "The input is temporarily unavailable. Try refining the plan later."
ja:
  theInputIsTemporarilyUnavailableTryRefiningThe: "入力欄を現在利用できません。しばらくしてからプランを調整してください。"
`;
const t = createTranslator(messages);


export function usePlanRefinementInput(
  notebookId: string,
  inputRef: RefObject<AiComposerInputHandle | null>,
  disabled?: boolean,
) {
  useLocale();
  useEffect(() => {
    const insert = (request: RefinePlanRequest | null | undefined) => {
      if (request?.notebookId !== notebookId || !request.text) return;
      const input = inputRef.current;
      const el = input?.getEditorEl();
      if (disabled || !input || !el) {
        toast.error(t("theInputIsTemporarilyUnavailableTryRefiningThe"));
        return;
      }
      input.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      const text = `${el.textContent?.trim() ? "\n\n" : ""}${request.text}`;
      if (!document.execCommand("insertText", false, text)) {
        const lines = text.split("\n");
        lines.forEach((line, index) => {
          if (index) el.appendChild(document.createElement("br"));
          el.appendChild(document.createTextNode(line));
        });
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      input.focus();
    };
    const handleRefine = (event: Event) => {
      const request = (event as CustomEvent<RefinePlanRequest>).detail;
      if (!disabled && !inputRef.current?.getEditorEl()) return;
      takePendingRefinement(notebookId, request);
      insert(request);
    };
    const frame = window.requestAnimationFrame(() => insert(takePendingRefinement(notebookId)));
    window.addEventListener(REFINE_PLAN_EVENT, handleRefine);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(REFINE_PLAN_EVENT, handleRefine);
    };
  }, [disabled, inputRef, notebookId]);
}
