import { useEffect } from "react";
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

type ToasterProps = React.ComponentProps<typeof Sonner> & {
  placement?: "edge" | "center";
};
type ToastMessage = Parameters<typeof sonnerToast>[0];

const defaultToastClassNames = {
  // 注意：
  // 1. 不要加 `toast` 标记类 —— @heroui/styles 定义了同名 .toast 组件类
  //    （position:absolute/left:0/right:0/pointer-events 等），会劫持 sonner 的布局
  //    并让关闭按钮点击失效。
  // 2. 不要加 !opacity-100 —— sonner 靠 opacity:0 隐藏过期/超出堆叠数的
  //    toast（data-visible=false），强制不透明会让"幽灵 toast"留在屏幕上且点不动。
  // 3. 宽度由 goose-toast.css 控制：max-content + max-width，避免固定 356px。
  toast:
    // Electron 旧内核不支持 hsl(var(--x)/alpha)，避免 bg-*/95、border-*/70 退化成实色
    "group goose-toast goose-toast-surface !font-medium !text-sm !overflow-visible",
  title: "!text-foreground !opacity-100 !font-semibold",
  description: "!text-muted-foreground",
  actionButton: cn(buttonVariants({ size: "sm" }), "!text-xs"),
  cancelButton: cn(buttonVariants({ variant: "ghost", size: "sm" }), "!text-xs"),
  // Sonner owns the close button and dismissal; share the IconButton recipe.
  closeButton: cn(iconButtonVariants({ tone: "muted", size: "xs" }),
    "[&_svg]:size-3.5 goose-toast-close !absolute !left-auto !right-1.5 !top-2 !transform-none !translate-x-0 !translate-y-0 !border-0 !bg-transparent !opacity-100 !cursor-pointer !shadow-none"),
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
  return <CircleCheck className="size-5 shrink-0 text-[var(--goose-color-success)]" aria-hidden="true" />;
}

function CloseToastIcon() {
  return <X className="pointer-events-none h-4 w-4" aria-hidden="true" strokeWidth={2.25} />;
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
      style={{ ...style, zIndex: UI_LAYERS.toast }}
      // 关闭 sonner 默认 richColors，错误视觉完全由全局 goose-toast-error 接管
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

/**
 * 全局唯一 toast 入口。
 * 错误态强制走 goose-toast-error（红字 + 圆底!，干净无装饰纹理），
 * 业务侧不得绕过这套视觉。
 */
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
        // 业务侧不得覆盖错误图标 / 错误样式类
        icon: <ErrorToastIcon />,
        className: cn("goose-toast-error", rest.className),
        classNames: {
          ...rest.classNames,
          toast: cn("goose-toast-error", rest.classNames?.toast),
          error: cn("goose-toast-error", rest.classNames?.error),
          title: cn("goose-toast-error-title", rest.classNames?.title),
          description: cn(
            "goose-toast-error-description",
            rest.classNames?.description,
          ),
          icon: cn("goose-toast-icon", rest.classNames?.icon),
          closeButton: cn(
            "goose-toast-error-close",
            rest.classNames?.closeButton,
          ),
        },
      });
    },
    message: (message: ToastMessage, data?: ExternalToast) =>
      sonnerToast.message(message, data),
    loading: (message: ToastMessage, data?: ExternalToast) =>
      sonnerToast.loading(message, data),
    custom: sonnerToast.custom.bind(sonnerToast),
    promise: sonnerToast.promise.bind(sonnerToast),
    dismiss: sonnerToast.dismiss.bind(sonnerToast),
    getHistory: sonnerToast.getHistory.bind(sonnerToast),
    getToasts: sonnerToast.getToasts.bind(sonnerToast),
  },
);

export { Toaster, toast, SuccessToastIcon };
