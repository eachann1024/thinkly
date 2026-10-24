import { SIDEBAR_WIDTH_MOTION_MS } from "../sidebarWidthMotion";

export function useSidebarFloating(forceCollapseLeft: boolean, sidebarOverlay: boolean) {
  const wasOverlay = useRef(false);
  const [fading, setFading] = useState(false);
  useLayoutEffect(() => {
    if (sidebarOverlay) {
      wasOverlay.current = true;
      setFading(false);
      return;
    }
    if (!wasOverlay.current || !forceCollapseLeft) {
      wasOverlay.current = false;
      return;
    }
    wasOverlay.current = false;
    setFading(true);
    const timer = window.setTimeout(() => setFading(false), SIDEBAR_WIDTH_MOTION_MS);
    return () => window.clearTimeout(timer);
  }, [forceCollapseLeft, sidebarOverlay]);
  return forceCollapseLeft && (sidebarOverlay || fading);
}
