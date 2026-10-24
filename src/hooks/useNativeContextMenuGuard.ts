import { useEffect } from "react";

export function useNativeContextMenuGuard() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      e.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);
}
