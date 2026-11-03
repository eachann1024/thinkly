import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { releaseStartupSettlingAfterPaint } from "@/lib/appearance";
import { endStartupSettlingHold, holdStartupSettling } from "@/lib/startupSettlingHold";
import { LaunchOverlay } from "./BootstrapScreen";
import {
  LAUNCH_ANIMATION_MS,
  LAUNCH_APP_READY_CAP_MS,
  LAUNCH_EXIT_MS,
  LAUNCH_REDUCED_FADE_MS,
  LAUNCH_STROKE_MS,
  launchTraceMountedAt,
  prefersReducedMotion,
  remainingUntil,
} from "./launchClock";

type GateState = { aborted: boolean; removed: boolean };

export type LaunchOverlayController = {
  whenStrokeEnds(task: () => void): void;
  waitUntilAppMount(): Promise<void>;
  armAppReady(): void;
  waitUntilReveal(): Promise<void>;
  exit(): Promise<void>;
  abort(): void;
  wasAborted(): boolean;
};

export function mountLaunchOverlay(): LaunchOverlayController {
  const host = document.createElement("div");
  host.className = "goose-launch-host";
  host.setAttribute("role", "status");
  document.body.appendChild(host);
  const overlayRoot = createRoot(host);
  overlayRoot.render(createElement(LaunchOverlay));

  const reduced = prefersReducedMotion();
  const state: GateState = { aborted: false, removed: false };
  const aborters = new Set<() => void>();
  let armed = false;
  let resolveAppReady: () => void = () => {};
  const appReady = new Promise<void>((resolve) => {
    resolveAppReady = resolve;
  });
  const wait = (ms: number) => cancellableDelay(ms, state, aborters);

  const remove = () => {
    if (state.removed) return;
    state.removed = true;
    overlayRoot.unmount();
    host.remove();
  };

  return {
    whenStrokeEnds(task) {
      void runAfterStroke(reduced, state, wait, task);
    },
    async waitUntilAppMount() {
      if (reduced || state.aborted) return;
      const anchor = await launchTraceMountedAt();
      if (state.aborted) return;
      await wait(remainingUntil(anchor, LAUNCH_STROKE_MS, performance.now()));
    },
    armAppReady() {
      if (armed || state.aborted) return;
      armed = true;
      holdStartupSettling(() => afterFrames(2, state, resolveAppReady));
    },
    async waitUntilReveal() {
      if (state.aborted) return;
      const anchor = reduced ? performance.now() : await launchTraceMountedAt();
      if (state.aborted) return;
      const motionDone = reduced
        ? Promise.resolve()
        : wait(remainingUntil(anchor, LAUNCH_ANIMATION_MS, performance.now()));
      await Promise.all([
        motionDone,
        capPromise(appReady, LAUNCH_APP_READY_CAP_MS, state, aborters),
      ]);
    },
    async exit() {
      if (state.aborted || state.removed) return;
      host.setAttribute("data-exiting", "");
      await wait(reduced ? LAUNCH_REDUCED_FADE_MS : LAUNCH_EXIT_MS);
      if (state.aborted || state.removed) return;
      remove();
      endStartupSettlingHold();
      releaseStartupSettlingAfterPaint();
    },
    abort() {
      if (state.aborted) return;
      state.aborted = true;
      resolveAppReady();
      for (const abortWait of aborters) abortWait();
      aborters.clear();
      remove();
      endStartupSettlingHold();
    },
    wasAborted: () => state.aborted,
  };
}

async function runAfterStroke(
  reduced: boolean,
  state: GateState,
  wait: (ms: number) => Promise<void>,
  task: () => void,
): Promise<void> {
  if (!reduced) {
    const anchor = await launchTraceMountedAt();
    if (state.aborted) return;
    await wait(remainingUntil(anchor, LAUNCH_STROKE_MS, performance.now()));
  }
  if (!state.aborted) task();
}

function cancellableDelay(
  ms: number,
  state: GateState,
  aborters: Set<() => void>,
): Promise<void> {
  if (state.aborted || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    let timer = 0;
    const cancel = () => {
      window.clearTimeout(timer);
      aborters.delete(cancel);
      resolve();
    };
    timer = window.setTimeout(() => {
      aborters.delete(cancel);
      resolve();
    }, ms);
    aborters.add(cancel);
  });
}

function capPromise(
  promise: Promise<void>,
  ms: number,
  state: GateState,
  aborters: Set<() => void>,
): Promise<void> {
  if (state.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    let timer = 0;
    const finish = () => {
      window.clearTimeout(timer);
      aborters.delete(finish);
      resolve();
    };
    timer = window.setTimeout(finish, ms);
    aborters.add(finish);
    void promise.then(finish);
  });
}

function afterFrames(frames: number, state: GateState, done: () => void): void {
  if (state.aborted || frames <= 0 || typeof requestAnimationFrame !== "function") {
    done();
    return;
  }
  requestAnimationFrame(() => afterFrames(frames - 1, state, done));
}
