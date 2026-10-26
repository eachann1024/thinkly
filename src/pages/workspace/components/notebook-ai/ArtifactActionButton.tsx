import type { ComponentProps } from "react";
import { Check, CircleAlert, LoaderCircle, type GooseIcon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ArtifactActionState } from "./useArtifactAction";

export function ArtifactActionButton({ icon: Icon, label, feedback, state = "idle", ...props }: {
  icon: GooseIcon; label: string; feedback?: string; state?: ArtifactActionState;
} & Omit<ComponentProps<typeof IconButton>, "children">) {
  const Glyph = state === "busy" ? LoaderCircle : state === "success" ? Check : state === "error" ? CircleAlert : Icon;
  const text = feedback ? `${label} · ${feedback}` : label;
  return <Tooltip>
    <TooltipTrigger asChild><span className="notebook-ai-artifact-action" data-state={state}>
      <IconButton type="button" size="sm" tone="muted" {...props}
        disabled={props.disabled || state === "busy"} busy={state === "busy"} aria-label={text}>
        <Glyph size={16} className={state === "busy" ? "animate-spin motion-reduce:animate-none" : undefined} />
      </IconButton>
    </span></TooltipTrigger>
    <TooltipContent>{text}</TooltipContent>
  </Tooltip>;
}
