import { createContext, useContext, useId, useLayoutEffect, useRef, type PropsWithChildren } from "react";
import { claimMenuRoot, releaseMenuRoot } from "./menu-root-ownership";

type MenuRoot = { id: string; open: boolean };
export const MenuRootContext = createContext<MenuRoot | null>(null);
export const MenuRootScopeContext = createContext<MenuRoot | null>(null);

export function MenuRootContent({ children }: PropsWithChildren) {
  const scope = useContext(MenuRootScopeContext);
  const parent = useContext(MenuRootContext);
  return <MenuRootContext.Provider value={scope ?? parent}>{children}</MenuRootContext.Provider>;
}

export function useMenuRoot(open: boolean, onOpenChange: (open: boolean) => void) {
  const id = useId();
  const parent = useContext(MenuRootContext);
  const change = useRef(onOpenChange);
  change.current = onOpenChange;
  const visible = open && (!parent || parent.open);
  useLayoutEffect(() => {
    if (parent) {
      if (open && !parent.open) change.current(false);
      return;
    }
    if (!visible) return;
    claimMenuRoot(id, () => change.current(false));
    return () => releaseMenuRoot(id);
  }, [id, open, visible, parent?.id, parent?.open]);
  return { id, open: visible };
}
