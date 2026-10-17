import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/git-sync/GitFolderIssue.tsx#localMessages:1">`
zh-Hans:
  folderIssue: "{{name}}：{{summary}}{{action}}"
  viewResolution: "，查看处理方式"
en:
  folderIssue: "{{name}}: {{summary}}{{action}}"
  viewResolution: ", view resolution"
ja:
  folderIssue: "{{name}}：{{summary}}{{action}}"
  viewResolution: "（対処方法を表示）"
`;
const uiText = createTranslator(localMessages);
import { useState } from "react";
import { CircleAlert } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function GitFolderIssue({
  name,
  summary,
  detail,
  actionLabel,
  actionDisabled,
  onAction,
}: {
  name: string;
  summary: string;
  detail: string;
  actionLabel?: string;
  actionDisabled: boolean;
  onAction: () => void;
}) {
  useLocale();
  const [open, setOpen] = useState(false);
  const trigger = (
    <Button
      type="button"
      variant="ghost"
      contentStyle="preserve"
      aria-label={uiText("folderIssue", { name, summary, action: actionLabel ? uiText("viewResolution") : "" })}
      className="group relative flex size-8 items-center justify-center rounded-lg p-0 text-muted-foreground hover:text-foreground"
    >
      <CircleAlert aria-hidden="true" className="size-4" />
    </Button>
  );
  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2">
      <Popover open={open} onOpenChange={setOpen} openOnHover>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          onOpenAutoFocus={(event) => event.preventDefault()}
          side="bottom"
          align="end"
          className="w-80 space-y-3 p-3 text-sm font-normal leading-relaxed"
        >
          <p className="text-sm whitespace-pre-wrap break-words">{detail}</p>
          {actionLabel && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={actionDisabled}
              onClick={() => {
                setOpen(false);
                onAction();
              }}
            >
              {actionLabel}
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
