import { useLocale } from "@/i18n";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WorkCardStatus } from "../WorkCardStatus";
import type { WorkCardStatusData } from "../workCardStatusContext";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/beautiful-ui/ApprovalCard.tsx#messages:1">`
zh-Hans:
  aiNoteChangePlan: "AI 笔记变更计划"
en:
  aiNoteChangePlan: "AI note change plan"
ja:
  aiNoteChangePlan: "AI ノート変更プラン"
`;
const t = createTranslator(messages);


export function ApprovalCard({
  title,
  status,
  children,
  footer,
  className,
}: {
  title: string;
  status: WorkCardStatusData;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  useLocale();
  return (
    <section
      className={cn(
        "bui-root bui-approval notebook-ai-approval-plan",
        className,
      )}
      aria-label={t("aiNoteChangePlan")}
      aria-busy={status.icon === "running" || undefined}
    >
      <WorkCardStatus status={status} />
      <p className="mt-3 min-w-0 text-[14px] font-semibold leading-normal text-foreground">
        {title}
      </p>
      <span
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {status.label}
      </span>
      {children}
      {footer ? <div className="mt-[22px]">{footer}</div> : null}
    </section>
  );
}
