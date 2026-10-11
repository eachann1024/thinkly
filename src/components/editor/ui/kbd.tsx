import { Kbd as SharedKbd } from "@/components/ui/kbd";
import type { ComponentProps } from "react";
export function Kbd(props: ComponentProps<typeof SharedKbd>) {
  return <SharedKbd context="editor" {...props} />;
}
