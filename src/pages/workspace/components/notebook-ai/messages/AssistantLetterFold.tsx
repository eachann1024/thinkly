import { useLocale } from "@/i18n";
import { Button } from "@/components/ui/button";
import { useState, type ReactNode } from "react";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/messages/AssistantLetterFold.tsx#messages:1">`
zh-Hans:
  thinking: "思考"
en:
  thinking: "Thinking"
ja:
  thinking: "思考"
`;
const t = createTranslator(messages);

function LetterFoldChevron() {
  return (
    <svg
      className="notebook-ai-letter-chev"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function AssistantLetterFold({ children }: { children: ReactNode }) {
  useLocale();
  const [open, setOpen] = useState(false);
  return (
    <div className="notebook-ai-letter-fold">
      <Button contentStyle="preserve" variant="ghost" size={null}
        type="button"
        className="notebook-ai-letter-fold-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <LetterFoldChevron />
        <span>{t("thinking")}</span>
      </Button>
      {open ? (
        <div className="notebook-ai-letter-fold-body">{children}</div>
      ) : null}
    </div>
  );
}
