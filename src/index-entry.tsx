import App from "./App.tsx";
import { bootstrap } from "./main";
import { initGooseNoteErrorReporting } from "./error-reporting/init";

initGooseNoteErrorReporting();
async function start() {
  if (import.meta.env.DEV && new URLSearchParams(location.search).get("caret-gallery") === "1") {
    const { CaretGallery } = await import("./dev/control-gallery/caret");
    return bootstrap(() => <CaretGallery />);
  }
  if (import.meta.env.DEV && new URLSearchParams(location.search).get("control-gallery") === "1") {
    const { ControlGallery } = await import("./dev/control-gallery");
    return bootstrap(() => <ControlGallery />);
  }
  return bootstrap(() => <App />);
}
void start();
