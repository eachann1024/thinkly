import * as GooseIcons from "@/components/ui/icons";
import * as React from "react";
import { Dialog as AriaDialog, Heading, Modal as AriaModal, ModalOverlay } from "react-aria-components";
import { cn } from "@/lib/utils";
import { TriggerChild } from "./trigger-child";
import { Button } from "./button";
import { IconButton } from "./icon-button";
import { OverlayLayerProvider, useModalLayer } from "./overlay-layer";

type DialogProps = React.PropsWithChildren<{
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}>;
const DialogDescriptionId = React.createContext<string | undefined>(undefined);
type DialogState = { open: boolean; setOpen: (open: boolean) => void };
const DialogStateContext = React.createContext<DialogState | null>(null);
function useDialogState() {
  const state = React.useContext(DialogStateContext);
  if (!state) throw new Error("Dialog components require Dialog");
  return state;
}
function Dialog({ open, defaultOpen, onOpenChange, children }: DialogProps) {
  const descriptionId = React.useId();
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen ?? false);
  const isOpen = open ?? uncontrolled;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (open === undefined) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange],
  );
  const state = React.useMemo(
    () => ({ open: isOpen, setOpen }),
    [isOpen, setOpen],
  );
  return (
    <DialogDescriptionId.Provider value={descriptionId}>
      <DialogStateContext.Provider value={state}>
        {children}
      </DialogStateContext.Provider>
    </DialogDescriptionId.Provider>
  );
}
const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild, children, onClick, ...props }, ref) => {
  const { setOpen } = useDialogState();
  const injected = {
    ...props,
    ref,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) setOpen(true);
    },
  };
  return asChild && React.isValidElement(children) ? (
    <TriggerChild
      child={
        children as React.ReactElement<React.HTMLAttributes<HTMLElement>>
      }
      injected={injected}
    />
  ) : (
    <button type="button" {...injected}>
      {children}
    </button>
  );
});
const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: boolean }
>(({ onClick, type = "button", icon = false, ...props }, ref) => {
  const { setOpen } = useDialogState();
  const Component = icon ? IconButton : Button;
  return (
    <Component
      {...props}
      ref={ref}
      type={type}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(false);
      }}
    />
  );
});
const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof ModalOverlay>
>(({ className, ...props }, ref) => {
  const { open, setOpen } = useDialogState();
  const layer = useModalLayer(open);
  return (
    <OverlayLayerProvider layer={layer}>
    <ModalOverlay
      {...props}
      ref={ref}
      isOpen={open}
      isDismissable
      onOpenChange={setOpen}
      data-goose-layer={layer}
      style={{ ...props.style, zIndex: layer }}
      className={cn(
        "fixed inset-0 bg-black/30 backdrop-blur-[1px]",
        className,
      )}
    />
    </OverlayLayerProvider>
  );
});
interface DialogContentProps extends Omit<
  React.ComponentPropsWithoutRef<typeof AriaDialog>,
  "children"
> {
  children: React.ReactNode;
  hideClose?: boolean;
  overlayClassName?: string;
}
const DialogContent = React.forwardRef<HTMLElement, DialogContentProps>(
  ({ className, children, hideClose, overlayClassName, ...props }, ref) => {
    const descriptionId = React.useContext(DialogDescriptionId);
    return (
      <DialogOverlay className={overlayClassName}>
        <AriaModal className="contents">
        <AriaDialog
          {...props}
          ref={ref}
          aria-describedby={props["aria-describedby"] ?? descriptionId}
          className={cn(
            "fixed left-[50%] top-[50%] z-0 goose-dialog-surface grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] outline-none",
            className,
          )}
        >
          {children}
          {!hideClose && (
            <DialogClose
              icon
              aria-label="关闭"
              className="absolute right-4 top-4 text-muted-foreground"
            >
              <GooseIcons.X className="h-4 w-4" />
            </DialogClose>
          )}
        </AriaDialog>
        </AriaModal>
      </DialogOverlay>
    );
  },
);
function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className,
      )}
    />
  );
}
function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className,
      )}
    />
  );
}
const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof Heading>
>(({ className, ...props }, ref) => (
  <Heading
    {...props}
    slot="title"
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    )}
  />
));
const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const id = React.useContext(DialogDescriptionId);
  return (
    <p
      id={id}
      {...props}
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
    />
  );
});
DialogTrigger.displayName = "DialogTrigger";
DialogOverlay.displayName = "DialogOverlay";
DialogContent.displayName = "DialogContent";
DialogTitle.displayName = "DialogTitle";
DialogDescription.displayName = "DialogDescription";
export {
  Dialog,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
export type { DialogProps };
