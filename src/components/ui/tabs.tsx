import * as React from "react";
import { Button, type ButtonProps } from "./button";
import { cn } from "@/lib/utils";

type TabsState = { value: string; setValue: (value: string) => void; id: string; orientation: "horizontal" | "vertical" };
const TabsContext = React.createContext<TabsState | null>(null);
function useTabsState() {
  const state = React.useContext(TabsContext);
  if (!state) throw new Error("Tabs components require Tabs");
  return state;
}
interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
}
export function Tabs({ value, defaultValue = "", onValueChange, orientation = "horizontal", children, ...props }: TabsProps) {
  const id = React.useId();
  const [internal, setInternal] = React.useState(defaultValue);
  const setValue = (next: string) => { if (value === undefined) setInternal(next); onValueChange?.(next); };
  return <TabsContext.Provider value={{ value: value ?? internal, setValue, id, orientation }}>
    <div {...props} data-goose-control="tabs">{children}</div>
  </TabsContext.Provider>;
}
export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { orientation } = useTabsState();
  return <div {...props} role="tablist" aria-orientation={orientation} data-goose-slot="tabs-list" className={cn("flex gap-2", orientation === "vertical" && "flex-col", className)} />;
}
interface TabsTriggerProps extends ButtonProps { value: string }
export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, onClick, onKeyDown, ...props }, ref) => {
    const state = useTabsState();
    const selected = state.value === value;
    return <Button {...props} ref={ref} type="button" role="tab" id={`${state.id}-tab-${value}`}
      aria-controls={`${state.id}-panel-${value}`} aria-selected={selected} tabIndex={selected ? 0 : -1}
      variant={selected ? "secondary" : "ghost"} data-goose-slot="tabs-trigger"
      onClick={event => { onClick?.(event); if (!event.defaultPrevented) state.setValue(value); }}
      onKeyDown={event => {
        onKeyDown?.(event); if (event.defaultPrevented) return;
        const forward = state.orientation === "vertical" ? "ArrowDown" : "ArrowRight";
        const backward = state.orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
        if (![forward, backward, "Home", "End"].includes(event.key)) return;
        const list = event.currentTarget.closest('[role="tablist"]');
        const triggers = Array.from(list?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)') ?? []);
        if (!triggers.length) return;
        event.preventDefault();
        const index = triggers.indexOf(event.currentTarget);
        const next = event.key === "Home" ? 0 : event.key === "End" ? triggers.length - 1 :
          (index + (event.key === forward ? 1 : -1) + triggers.length) % triggers.length;
        triggers[next].focus(); triggers[next].click();
      }} />;
  },
);
TabsTrigger.displayName = "TabsTrigger";
interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> { value: string }
export function TabsContent({ value, ...props }: TabsContentProps) {
  const state = useTabsState();
  return <div {...props} role="tabpanel" id={`${state.id}-panel-${value}`} aria-labelledby={`${state.id}-tab-${value}`}
    hidden={state.value !== value} tabIndex={0} data-goose-slot="tabs-panel" />;
}
