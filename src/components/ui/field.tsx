import * as React from "react";
import { cn } from "@/lib/utils";

interface FieldState { id: string; describedBy?: string; invalid?: boolean }
const FieldContext = React.createContext<FieldState | undefined>(undefined);
export function useFieldControl(props: { id?: string; "aria-describedby"?: string; "aria-invalid"?: React.AriaAttributes["aria-invalid"] }) {
  const field = React.useContext(FieldContext);
  return {
    id: props.id ?? field?.id,
    "aria-describedby": [props["aria-describedby"], field?.describedBy].filter(Boolean).join(" ") || undefined,
    "aria-invalid": props["aria-invalid"] ?? (field?.invalid || undefined),
  };
}
export interface FieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  controlId?: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
}
export function Field({ controlId, label, description, error, required, className, children, ...props }: FieldProps) {
  const generatedId = React.useId();
  const id = controlId ?? generatedId;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [description ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return <FieldContext.Provider value={{ id, describedBy, invalid: !!error }}>
    <div data-goose-control="field" className={cn("goose-field-group flex flex-col gap-1.5", className)} {...props}>
      {label && <label htmlFor={id} className="text-sm font-medium">{label}{required && <span aria-hidden="true"> *</span>}</label>}
      {children}
      {description && <div id={helpId} className="text-xs text-muted-foreground">{description}</div>}
      {error && <div id={errorId} role="alert" className="goose-field-error text-xs text-destructive">{error}</div>}
    </div>
  </FieldContext.Provider>;
}
