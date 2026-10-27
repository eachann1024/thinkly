import { cloneElement, type ComponentProps, type ReactElement } from "react";
import { Dropdown } from "@heroui/react";

export function DropdownMenuSub({
  children,
  delay = 0,
  ...props
}: ComponentProps<typeof Dropdown.SubmenuTrigger>) {
  return (
    <Dropdown.SubmenuTrigger {...props} delay={delay}>
      {children[0]}
      {cloneElement(
        children[1] as ReactElement<{ "data-goose-submenu"?: string }>,
        { "data-goose-submenu": "" },
      )}
    </Dropdown.SubmenuTrigger>
  );
}
