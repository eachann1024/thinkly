import type { ReactNode } from "react";
import type { GooseIcon } from "@/components/ui/icons";
import { ArrowRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Switch, SwitchRow } from "@/components/ui/switch";
import { SettingsSectionCard } from "./SettingsSectionCard";

export function ModuleActivation({
  icon: Icon,
  label,
  disabled,
  error,
  onEnable,
  illustration,
  decoration,
}: {
  icon: GooseIcon;
  label: string;
  disabled?: boolean;
  error?: string;
  onEnable: () => void;
  illustration?: ReactNode;
  decoration?: ReactNode;
}) {
  return (
    <section className="relative flex min-h-64 flex-col items-center justify-center gap-6 overflow-hidden px-4 py-8">
      {decoration}
      {illustration ?? <Icon className="h-8 w-8 text-muted-foreground" aria-hidden />}
      <Button type="button" className="relative" disabled={disabled} onClick={onEnable}>
        {label}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
      {error ? <p role="alert" className="relative m-0 text-sm text-danger">{error}</p> : null}
    </section>
  );
}

export function ModuleEnabledRow({
  id,
  icon: Icon,
  label,
  description,
  checked,
  disabled,
  error,
  onCheckedChange,
  cardClassName,
  contentClassName,
}: {
  id: string;
  icon: GooseIcon;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  error?: string;
  onCheckedChange: (checked: boolean) => void;
  cardClassName?: string;
  contentClassName?: string;
}) {
  return (
    <SettingsSectionCard className={cardClassName} contentClassName={contentClassName}>
      <SwitchRow className={`goose-settings-option-row flex items-center justify-between gap-3${description ? " goose-settings-option-row--stack" : ""}`}>
        <span className="min-w-0">
          <span className="flex items-center gap-3">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="text-sm font-normal leading-5 text-foreground">{label}</span>
          </span>
          {description ? (
            <span className="mt-1 block pl-7 text-[13px] leading-5 text-muted-foreground">{description}</span>
          ) : null}
        </span>
        <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
      </SwitchRow>
      {error ? <p role="alert" className="m-0 text-sm text-danger">{error}</p> : null}
    </SettingsSectionCard>
  );
}
