import { useEffect, type CSSProperties } from "react";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";
import type { ExternalToast } from "sonner";
import { CircleCheck, X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useSettings } from "@/stores/useSettings";
import { buttonVariants } from "./button";
import { iconButtonVariants } from "./icon-button";
import { createPortal } from "react-dom";
import { UI_LAYERS } from "@/lib/uiLayers";
import { toastLayoutCssVars } from "./toast-layout";

type ToasterProps = React.ComponentProps<typeof Sonner> & {
  placement?: "edge" | "center";
};
type ToastMessage = Parameters<typeof sonnerToast>[0];

const defaultToastClassNames = {
  toast:
    "group goose-toast goose-toast-surface !text-sm !overflow-visible",
  title: "!text-foreground !opacity-100 !font-medium !text-[14px]",
  description: "!text-[13px] !text-muted-foreground",
  actionButton: cn(buttonVariants({ size: "sm" }), "!text-xs !font-medium"),
  cancelButton: cn(buttonVariants({ variant: "ghost", size: "sm" }), "!text-xs"),
  closeButton: cn(iconButtonVariants({ tone: "muted", size: "xs" }), "goose-toast-close [&_svg]:size-4"),
  error:
    "goose-toast-error",
  success: "goose-toast-success",
  icon: "goose-toast-icon",
} satisfies NonNullable<ToasterProps["toastOptions"]>["classNames"];

function ErrorToastIcon() {
  return (
    <span className="goose-toast-error-mark" aria-hidden="true">
      !
    </span>
  );
}

function SuccessToastIcon() {
  return <CircleCheck className="size-[var(--goose-toast-icon)] shrink-0 text-[var(--goose-color-success)]" aria-hidden="true" />;
}

function CloseToastIcon() {
  return <X className="pointer-events-none" aria-hidden="true" strokeWidth={2.25} />;
}

function successToast(message: ToastMessage, data?: ExternalToast) {
  const { className, classNames, ...rest } = data ?? {};
  return sonnerToast.success(message, {
    ...rest,
    className: cn("goose-toast-success", className),
    classNames: {
      ...classNames,
      toast: cn("goose-toast-success", classNames?.toast),
      success: cn("goose-toast-success", classNames?.success),
      actionButton: cn("goose-toast-success-action", classNames?.actionButton),
    },
  });
}

const Toaster = ({
  className,
  toastOptions,
  icons,
  placement = "edge",
  style,
  ...props
}: ToasterProps) => {
  const theme = useResolvedTheme(useSettings((state) => state.theme));
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const closeBtn = target?.closest?.(
        "[data-sonner-toast] [data-close-button]",
      ) as HTMLElement | null;
      if (closeBtn) {
        e.preventDefault();
        closeBtn.click();
      }
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, []);

  return createPortal(
    <div data-react-aria-top-layer="">
    <Sonner
      theme={theme}
      position="top-right"
      offset={22}
      mobileOffset={22}
      closeButton
      swipeDirections={["left", "right", "top"]}
      className={cn("toaster group goose-toaster", placement === "center" && "goose-toaster-center", className)}
      style={{ ...(toastLayoutCssVars() as CSSProperties), ...style, zIndex: UI_LAYERS.toast }}
      richColors={false}
      icons={{
        ...icons,
        success: icons?.success ?? <SuccessToastIcon />,
        close: <CloseToastIcon />,
        error: <ErrorToastIcon />,
      }}
      toastOptions={{
        duration: 2600,
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          toast: cn(
            defaultToastClassNames.toast,
            toastOptions?.classNames?.toast,
          ),
          title: cn(
            defaultToastClassNames.title,
            toastOptions?.classNames?.title,
          ),
          description: cn(
            defaultToastClassNames.description,
            toastOptions?.classNames?.description,
          ),
          actionButton: cn(
            defaultToastClassNames.actionButton,
            toastOptions?.classNames?.actionButton,
          ),
          cancelButton: cn(
            defaultToastClassNames.cancelButton,
            toastOptions?.classNames?.cancelButton,
          ),
          closeButton: cn(
            defaultToastClassNames.closeButton,
            toastOptions?.classNames?.closeButton,
          ),
          error: cn(
            defaultToastClassNames.error,
            toastOptions?.classNames?.error,
          ),
          success: cn(
            defaultToastClassNames.success,
            toastOptions?.classNames?.success,
          ),
          icon: cn(defaultToastClassNames.icon, toastOptions?.classNames?.icon),
        },
      }}
      {...props}
      visibleToasts={placement === "center" ? 1 : props.visibleToasts}
    />
    </div>,
    document.body,
  );
};

const toast = Object.assign(
  (message: ToastMessage, data?: ExternalToast) => sonnerToast(message, data),
  {
    success: successToast,
    info: (message: ToastMessage, data?: ExternalToast) =>
      sonnerToast.info(message, data),
    warning: (message: ToastMessage, data?: ExternalToast) =>
      sonnerToast.warning(message, data),
    error: (message: ToastMessage, data?: ExternalToast) => {
      const { icon: _ignoredIcon, ...rest } = data ?? {};
      return sonnerToast.error(message, {
        ...rest,
        icon: <ErrorToastIcon />,
        className: cn("goose-toast-error", rest.className),
        classNames: {
          ...rest.classNames,
          toast: cn("goose-toast-error", rest.classNames?.toast),
          error: cn("goose-toast-error", rest.classNames?.error),
        },
      });
    },
    message: (message: ToastMessage, data?: ExternalToast) =>
      sonnerToast.message(message, data),
    loading: (message: ToastMessage, data?: ExternalToast) =>
      sonnerToast.loading(message, data),
    promise: sonnerToast.promise.bind(sonnerToast),
    dismiss: sonnerToast.dismiss.bind(sonnerToast),
    getHistory: sonnerToast.getHistory.bind(sonnerToast),
    getToasts: sonnerToast.getToasts.bind(sonnerToast),
  },
);

export { Toaster, toast };
