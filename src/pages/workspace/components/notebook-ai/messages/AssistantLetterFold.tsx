import { useLocale } from "@/i18n";
import { ChevronRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useId, useState, type ReactNode } from "react";
import { ExecutionDisclosure } from "../ExecutionDisclosure";
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

export function AssistantLetterFold({ children }: { children: ReactNode }) {
  useLocale();
  const [open, setOpen] = useState(false);
  const disclosureId = useId();
  return (
    <div className="notebook-ai-letter-fold">
      <Button contentStyle="preserve" variant="ghost" size={null}
        type="button"
        className="notebook-ai-letter-fold-toggle"
        aria-expanded={open}
        aria-controls={disclosureId}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronRight className="notebook-ai-letter-chev" size={16} />
        <span>{t("thinking")}</span>
      </Button>
      <ExecutionDisclosure
        open={open}
        id={disclosureId}
        className="notebook-ai-letter-fold-body"
      >
        {children}
      </ExecutionDisclosure>
    </div>
  );
}
