import { SIDEBAR_WIDTH_MOTION_MS } from "../sidebarWidthMotion";

/**
 * 窄窗里的临时面板收起后继续浮着淡出。
 * 并排侧栏收起留在文档流里，窗口拖窄自动收起才能把正文宽度一起动画。
 */
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
