import { installRuntimePolyfills } from "./bootstrap/runtimePolyfills";
import { installIteratorPolyfills } from "./bootstrap/iteratorPolyfills";
import { applyRolldownPolyfills } from "@/lib/rolldown-polyfill";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import "./index.css";
import "./fonts.css";
import { clearStartupSettling, markStartupSettling } from "@/lib/appearance";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BootstrapScreen } from "./bootstrap/BootstrapScreen";
import { initializeApplicationState, type BootstrapMode } from "./bootstrap/initializeApplicationState";
import { scheduleBackgroundWarmup, warmLaunchScreen } from "./bootstrap/backgroundWarmup";
import { mountLaunchOverlay, type LaunchOverlayController } from "./bootstrap/launchGate";
import { prepareLaunchAppearance } from "./bootstrap/launchPreferences";

installRuntimePolyfills();
installIteratorPolyfills();
applyRolldownPolyfills();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

export const bootstrap = async (
  renderRoot: () => ReactNode,
  options: { mode?: BootstrapMode; beforeInit?: () => Promise<void> | void } = {},
) => {
  const { mode = "full", beforeInit } = options;
  const lean = mode !== "full";
  document.addEventListener(
    "pointerdown",
    () => {
      document.documentElement.dataset.goosePointerFocus = "true";
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown", "Enter", " ", "Escape"].includes(event.key))
        delete document.documentElement.dataset.goosePointerFocus;
    },
    true,
  );
  if (!lean) prepareLaunchAppearance();
  const root = createRoot(rootElement);
  const launch: LaunchOverlayController | null = lean ? null : mountLaunchOverlay();
  if (launch) launch.whenStrokeEnds(warmLaunchScreen);
  else if (mode !== "search") root.render(<BootstrapScreen lean={lean} />);

  const showStartupError = (error: unknown) => {
    launch?.abort();
    clearStartupSettling();
    root.render(<BootstrapScreen lean={lean} error={error} />);
  };

  try {
    await initializeApplicationState(mode, beforeInit);

    const renderApplication = () => {
      if (!lean) {
        markStartupSettling();
        launch?.armAppReady();
      }
      root.render(
        <ErrorBoundary
          fallback={(error) => {
            clearStartupSettling();
            if (launch) queueMicrotask(() => launch.abort());
            return <BootstrapScreen lean={lean} error={error} />;
          }}
        >
          {renderRoot()}
        </ErrorBoundary>,
      );
    };

    if (lean) {
      renderApplication();
    } else {
      const { prepareWorkspaceStartup, renderWorkspaceAfterStartup } =
        await import("@/lib/workspaceStartup");
      const startupResult = await renderWorkspaceAfterStartup({
        prepare: prepareWorkspaceStartup,
        render: async () => {
          await launch?.waitUntilAppMount();
          if (launch?.wasAborted()) return;
          renderApplication();
          await launch?.waitUntilReveal();
          await launch?.exit();
        },
        renderError: (error) => {
          console.error("[bootstrap] 工作区恢复失败", error);
          showStartupError(error);
        },
      });
      if (startupResult === "error") return;
    }
  } catch (error) {
    console.error("[bootstrap] 初始化失败", error);
    showStartupError(error);
    return;
  }

  if (mode !== "search") scheduleBackgroundWarmup(rootElement);
};
