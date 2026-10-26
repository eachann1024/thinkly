import { lazy, useState, type ComponentType } from "react";

// Preloading and rendering share one request. A failed speculative load must
// not poison the next user-initiated attempt.
export function deferredComponent<Props extends object>(
  importer: () => Promise<{ default: ComponentType<Props> }>,
) {
  let resolved: ComponentType<Props> | null = null;
  let pending: ReturnType<typeof importer> | null = null;
  let Lazy = lazy(load);

  function load() {
    pending ??= importer().then((module) => {
      resolved = module.default;
      return module;
    }).catch((error: unknown) => {
      pending = null;
      Lazy = lazy(load);
      throw error;
    });
    return pending;
  }

  function Component(props: Props) {
    // Keep the element type stable if the import settles during a render.
    // Switching from Lazy to the resolved component would remount its state.
    const [Ready] = useState(() => resolved ?? Lazy);
    return <Ready {...props} />;
  }

  return { Component, load };
}
