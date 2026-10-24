import type { WebContents } from "electron";

export function lockWebContentsPageZoom(contents: WebContents): void {
  if (contents.isDestroyed() || contents.getType() === "devtools") return;

  const pin = () => {
    if (contents.isDestroyed()) return;
    contents.setZoomFactor(1);
    contents.setZoomLevel(0);
    void contents.setVisualZoomLevelLimits(1, 1);
  };

  pin();
  contents.on("did-finish-load", pin);
  contents.on("zoom-changed", pin);
}
