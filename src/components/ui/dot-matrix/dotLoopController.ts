type Driver = {
  resumeDotLoops(el: Element): void;
  pauseDotLoops(el: Element): void;
  releaseDotLoops(el: Element): void;
};

/** Load the shared clock only for a visible illustration; preserve the latest lifecycle intent. */
export function createLoopController(load: () => Promise<Driver>) {
  let driver: Driver | undefined, loading: Promise<void> | undefined;
  const pending = new Map<Element, boolean>();
  return {
    resumeDotLoops(el: Element) {
      if (driver) { driver.resumeDotLoops(el); return; }
      pending.set(el, true);
      if (loading) return;
      loading = load().then((loaded) => {
        driver = loaded;
        loading = undefined;
        const queued = [...pending];
        pending.clear();
        for (const [target, active] of queued) if (active) driver.resumeDotLoops(target);
      }).catch(() => { loading = undefined; });
    },
    pauseDotLoops(el: Element) {
      if (driver) driver.pauseDotLoops(el);
      else if (pending.has(el)) pending.set(el, false);
    },
    releaseDotLoops(el: Element) {
      pending.delete(el);
      driver?.releaseDotLoops(el);
    },
  };
}

export const { resumeDotLoops, pauseDotLoops, releaseDotLoops } = createLoopController(
  () => import("./dotLoopScheduler"),
);
