import { cva } from "class-variance-authority";

export type ControlContext = "shell" | "editor" | "media";
export const controlState = "goose-control transition-colors duration-[var(--goose-control-motion-duration,150ms)] disabled:pointer-events-none disabled:text-disabled motion-reduce:transition-none";
export const controlFrame = `${controlState} inline-flex items-center justify-center`;
// Button/Toggle already owned icon sizing; IconButton must retain its child's explicit size.
export const buttonContent = "gap-2 whitespace-nowrap rounded-[var(--goose-control-radius,8px)] text-[length:var(--goose-control-font-size,14px)] font-medium [&_svg]:pointer-events-none [&_svg]:size-[var(--goose-control-icon-size,16px)] [&_svg]:shrink-0";
export const controlSizes = {
  default: "h-[var(--goose-control-height,40px)] px-4 py-2",
  sm: "h-[var(--goose-control-height-compact,36px)] px-3",
  lg: "h-11 px-8",
  icon: "h-[var(--goose-control-height,40px)] w-[var(--goose-control-height,40px)] p-0",
};
export const toggleSizes = {
  default: "h-[var(--goose-control-height,40px)] px-3 min-w-[var(--goose-control-height,40px)]",
  sm: "h-[var(--goose-control-height-compact,36px)] px-2.5 min-w-[var(--goose-control-height-compact,36px)]",
  lg: "h-11 px-5 min-w-11",
  icon: controlSizes.icon,
};
const buttonRecipe = cva(`${controlState} rounded-[var(--goose-control-radius,8px)]`, {
  variants: {
    variant: {
      default: "goose-interactive goose-interactive-primary shadow-none",
      destructive: "goose-interactive goose-interactive-danger",
      outline: "goose-interactive border-border bg-background",
      secondary: "goose-interactive bg-secondary text-secondary-foreground shadow-none",
      ghost: "goose-interactive border-transparent bg-transparent",
      link: "border-transparent text-link underline-offset-4 hover:underline",
    },
    size: controlSizes,
    contentStyle: { default: `${buttonContent} inline-flex items-center justify-center border`, preserve: "" },
    context: { shell: "", editor: "goose-control-editor", media: "goose-control-media" },
  },
  compoundVariants: [{ variant: "ghost", size: "icon", className: "goose-toolbar-action" }],
  defaultVariants: { variant: "default", size: "default", context: "shell", contentStyle: "default" },
});
// Raw controls retain their geometry; an explicitly requested size still applies.
export function buttonVariants(props?: Parameters<typeof buttonRecipe>[0]) {
  const size = props?.size === undefined && props?.contentStyle === "preserve" ? null : props?.size;
  return buttonRecipe({ ...props, size });
}
export const fieldVariants = cva("goose-field w-full rounded-[var(--goose-field-radius,8px)] border border-input bg-background px-3 py-2 placeholder:text-placeholder disabled:cursor-not-allowed disabled:text-disabled", {
  variants: {
    context: { shell: "", editor: "goose-field-editor rounded-[var(--goose-editor-field-radius,10px)]", media: "goose-field-media" },
    variant: { default: "text-base md:text-sm", inline: "goose-inline-field border-transparent bg-transparent p-0 rounded-none", search: "goose-search-field text-base md:text-sm" },
    controlSize: { default: "h-[var(--goose-field-height,40px)]", compact: "h-[var(--goose-control-height-compact,36px)]", small: "h-[var(--goose-control-height-small,28px)]" },
  },
  defaultVariants: { context: "shell", variant: "default", controlSize: "default" },
});
