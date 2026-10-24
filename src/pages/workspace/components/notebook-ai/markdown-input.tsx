import { Input } from "@/components/ui/input";
import type { ComponentProps } from "react";
import { Check } from "@/components/ui/icons";

export function MdInput({
  node,
  ...props
}: ComponentProps<"input"> & { node?: unknown }) {
  void node;
  if (props.type === "checkbox") {
    return (
      <span
        className="ai-md-checkbox"
        data-checked={props.checked ? "true" : "false"}
      >
        {props.checked ? <Check strokeWidth={2.5} /> : null}
      </span>
    );
  }
  return <Input {...props} />;
}
