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
  const [open, setOpen] = useState(false);
  const trigger = (
    <Button
      type="button"
      variant="ghost"
      contentStyle="preserve"
      aria-label={`${name}：${summary}${actionLabel ? "，查看处理方式" : ""}`}
      className="group relative flex size-8 items-center justify-center rounded-lg p-0 text-muted-foreground hover:text-foreground"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[2px] rounded-[inherit] border-2 border-[var(--goose-accent-outline-focus)] opacity-0 group-focus-visible:opacity-100"
      />
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
