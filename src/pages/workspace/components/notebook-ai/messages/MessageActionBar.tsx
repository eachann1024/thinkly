import { useLocale } from "@/i18n";
import { IconButton } from "@/components/ui/icon-button";
import { ActionBarPrimitive, BranchPickerPrimitive } from "@assistant-ui/react";
import { Copy, ChevronLeft, ChevronRight } from "@/components/ui/icons";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/messages/MessageActionBar.tsx#messages:1">`
zh-Hans:
  copyMessage: "复制消息"
  copy: "复制"
  previousResponseBranch: "上一个回答分支"
  nextResponseBranch: "下一个回答分支"
en:
  copyMessage: "Copy message"
  copy: "Copy"
  previousResponseBranch: "Previous response branch"
  nextResponseBranch: "Next response branch"
`;
const t = createTranslator(messages);

export const MessageActionBar = () => { useLocale(); return ((
  <div className="notebook-ai-message-actions mt-1 flex h-6 min-h-6 items-center gap-1">
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="never"
      autohideFloat="never"
      className="flex items-center gap-1"
    >
      <ActionBarPrimitive.Copy render={<IconButton size="xs" tone="muted" />}
        copiedDuration={1600}
        className="disabled:hidden"
        aria-label={t("copyMessage")}
        title={t("copy")}
      >
        <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
      </ActionBarPrimitive.Copy>
    </ActionBarPrimitive.Root>
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className="flex items-center gap-0.5 text-[11px] text-muted-foreground"
    >
      <BranchPickerPrimitive.Previous render={<IconButton size="xs" tone="muted" />}
        className="disabled:text-disabled"
        aria-label={t("previousResponseBranch")}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </BranchPickerPrimitive.Previous>
      <span>
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next render={<IconButton size="xs" tone="muted" />}
        className="disabled:text-disabled"
        aria-label={t("nextResponseBranch")}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  </div>
)); };
