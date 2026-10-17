import { useLocale } from "@/i18n";
import { common } from "@/i18n/common";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/components/ui/dialog-shell.tsx#localMessages:1">`
zh-Hans:
  dialog: "对话框"
  dialogContent: "对话框内容"
en:
  dialog: "Dialog"
  dialogContent: "Dialog content"
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
interface DialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout?: "center" | "fullscreen";
  title?: React.ReactNode;
  description?: React.ReactNode;
  hideClose?: boolean;
  contentClassName?: string;
  overlayClassName?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function DialogShell({
  open,
  onOpenChange,
  layout = "center",
  title,
  description,
  hideClose = false,
  contentClassName,
  overlayClassName,
  bodyClassName,
  footer,
  children,
}: DialogShellProps) {
  useLocale();
  const isFullscreen = layout === "fullscreen";
  const resolvedOverlayClassName =
    overlayClassName ??
    (isFullscreen ? "bg-transparent backdrop-blur-0" : undefined);
  const hasTitle = Boolean(title);
  const hasDescription = Boolean(description);
  const accessibleTitle = hasTitle ? title : uiText("dialog");
  const accessibleDescription = hasDescription ? description : uiText("dialogContent");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        overlayClassName={resolvedOverlayClassName}
        className={cn(
          "goose-dialog-shell origin-center data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-right-0 data-[state=closed]:slide-out-to-top-0 data-[state=closed]:slide-out-to-bottom-0 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-right-0 data-[state=open]:slide-in-from-top-0 data-[state=open]:slide-in-from-bottom-0",
          isFullscreen
            ? "goose-dialog-shell-fullscreen left-0 top-[var(--goose-top-safe-area,0px)] h-[calc(100dvh-var(--goose-top-safe-area,0px))] w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-0 p-0 shadow-none"
            : "sm:max-w-lg",
          contentClassName,
        )}
      >
        {!hideClose && (
          <DialogClose
            icon
            type="button"
            className={cn(
              "absolute z-10 text-muted-foreground",
              isFullscreen ? "top-4 right-4" : "top-4 right-4",
            )}
            aria-label={common("close")}
          >
            <GooseIcons.X className="h-7 w-7" />
          </DialogClose>
        )}

        <DialogHeader
          className={cn(hasTitle || hasDescription ? "goose-dialog-shell-header" : "sr-only")}
        >
          <DialogTitle className={hasTitle ? undefined : "sr-only"}>
            {accessibleTitle}
          </DialogTitle>
          <DialogDescription className={hasDescription ? undefined : "sr-only"}>
            {accessibleDescription}
          </DialogDescription>
        </DialogHeader>

        <div className={cn("goose-dialog-shell-body", bodyClassName)}>{children}</div>

        {footer ? (
          <DialogFooter className="goose-dialog-shell-footer">{footer}</DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
