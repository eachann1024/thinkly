import { readFileSync } from "node:fs";
import path from "node:path";
import { createLoopClock, loopOffsets, nextLoopBoundary } from "../../src/components/ui/dot-matrix/loopClock";
import { createLoopController } from "../../src/components/ui/dot-matrix/dotLoopController";
import { createChecker } from "./lib/check";

function harness() {
  let now = 0, nextId = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const clock = createLoopClock({
    now: () => now,
    schedule(callback, delay) { const id = ++nextId; timers.set(id, { at: now + delay, callback }); return id; },
    cancel(timer) { timers.delete(timer as number); },
  });
  return {
    clock, timers,
    advance(time: number) {
      now = time;
      const due = [...timers].filter(([, timer]) => timer.at <= now);
      for (const [id, timer] of due) { timers.delete(id); timer.callback(); }
    },
  };
}

async function lifecycleFixture() {
  let now = 0, timerId = 0;
  const timers = new Set<number>();
  class FixtureElement {
    attributes = new Map<string, string>();
    animations: FixtureAnimation[] = [];
    constructor(public selector: string, public root: FixtureElement | null = null) {}
    matches(selector: string) { return selector.includes(this.selector); }
    closest() { return this.root ?? this; }
    getAnimations() { return this.animations; }
    setAttribute(name: string, value: string) { this.attributes.set(name, value); }
    removeAttribute(name: string) { this.attributes.delete(name); }
  }
  class FixtureEffect {
    constructor(public target: FixtureElement, public duration = 12000, public delay = -6000) {}
    getTiming() { return { duration: this.duration, delay: this.delay, direction: "normal", iterations: Infinity }; }
  }
  class FixtureAnimation {
    playState = "running";
    constructor(public animationName: string, public effect: FixtureEffect, public currentTime = 0) {}
    pause() { this.playState = "paused"; }
  }
  class FixtureObserver { observe() {} disconnect() {} }
  const replacement = {
    Element: FixtureElement, CSSAnimation: FixtureAnimation, KeyframeEffect: FixtureEffect,
    MutationObserver: FixtureObserver, performance: { now: () => now },
    setTimeout() { const id = ++timerId; timers.add(id); return id; },
    clearTimeout(id: number) { timers.delete(id); },
  };
  const original = new Map(Object.keys(replacement).map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  let release: ((el: any) => void) | undefined;
  const root = new FixtureElement(".goose-dm"), target = new FixtureElement("g", root);
  const character = new FixtureElement(".goose-cs"), eye = new FixtureElement("img", character);
  try {
    for (const [name, value] of Object.entries(replacement)) Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    const scheduler = await import("../../src/components/ui/dot-matrix/dotLoopScheduler");
    release = scheduler.releaseDotLoops;
    const old = new FixtureAnimation("goose-dm-breathe", new FixtureEffect(target), 1234);
    root.animations = [old];
    scheduler.resumeDotLoops(root as any);
    now = 500;
    scheduler.pauseDotLoops(root as any);
    old.playState = "idle"; // CSS display:none cancels the original object without unmounting.
    const fresh = new FixtureAnimation("goose-dm-breathe", new FixtureEffect(target));
    root.animations = [fresh];
    scheduler.resumeDotLoops(root as any);
    const restored = fresh.currentTime === 1734 && fresh.playState === "paused";
    const blink = new FixtureAnimation("goose-cs-blink-open", new FixtureEffect(eye, 7000, -5000), 420);
    character.animations = [blink]; // A still character may have blinking images and no float.
    scheduler.resumeDotLoops(character as any);
    const blinking = blink.playState === "paused" && blink.currentTime === 420 && character.attributes.get("data-dm-clock") === "boundary";
    scheduler.pauseDotLoops(character as any);
    const held = blink.currentTime;
    now = 10000;
    scheduler.resumeDotLoops(character as any);
    return { restored, blinking: blinking && blink.currentTime === held };
  } finally {
    release?.(root); release?.(character);
    for (const [name, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
}

async function loadingFixture() {
  const calls: string[] = [];
  const elements = ["active", "paused", "released", "reactivated"].map((id) => ({ id }) as unknown as Element);
  const driver = {
    resumeDotLoops(el: Element) { calls.push(`resume:${el.id}`); },
    pauseDotLoops(el: Element) { calls.push(`pause:${el.id}`); },
    releaseDotLoops(el: Element) { calls.push(`release:${el.id}`); },
  };
  let resolve!: (value: typeof driver) => void, loads = 0;
  const promise = new Promise<typeof driver>((done) => { resolve = done; });
  const controller = createLoopController(() => { loads++; return promise; });
  for (let index = 0; index < 100; index++) controller.resumeDotLoops(elements[0]);
  for (const el of elements.slice(1)) controller.resumeDotLoops(el);
  controller.pauseDotLoops(elements[1]); controller.releaseDotLoops(elements[2]);
  controller.pauseDotLoops(elements[3]); controller.resumeDotLoops(elements[3]);
  resolve(driver);
  const settle = async () => { for (let index = 0; index < 4; index++) await Promise.resolve(); };
  await settle();
  const loadedOnce = loads === 1 && calls.join() === "resume:active,resume:reactivated";
  controller.pauseDotLoops(elements[0]); controller.releaseDotLoops(elements[0]); controller.resumeDotLoops(elements[1]);
  const synchronous = calls.slice(-3).join() === "pause:active,release:active,resume:paused";
  let attempts = 0;
  calls.length = 0;
  const retry = createLoopController(() => ++attempts === 1 ? Promise.reject(new Error("load failed")) : Promise.resolve(driver));
  retry.resumeDotLoops(elements[0]); retry.resumeDotLoops(elements[1]); retry.pauseDotLoops(elements[1]);
  await settle();
  retry.releaseDotLoops(elements[0]); retry.resumeDotLoops(elements[3]);
  await settle();
  return { loadedOnce, synchronous, retried: attempts === 2 && calls.join() === "resume:reactivated" };
}

export default async function run() {
  const checker = createChecker(), { check } = checker;
  const normal = loopOffsets("goose-dm-breathe"), glint = loopOffsets("goose-dm-glint");
  check("普通循环每个半周期分两步，光亮按opacity与transform各自关键帧并集取样",
    JSON.stringify(normal) === "[0,0.25,0.5,0.75,1]"
      && JSON.stringify(glint) === "[0,0.14,0.28,0.34,0.48,0.68,0.84,1]");
  check("负delay仅计入一次，保留初始相位与自定义周期",
    nextLoopBoundary(0, 12000, -6000, normal) === 3000
      && nextLoopBoundary(3000, 12000, -6000, normal) === 6000
      && nextLoopBoundary(0, 1234, -317, normal) === 300
      && nextLoopBoundary(0, 12000, 400, normal) === 400);
  check("跨周期及光亮非均匀边界不会漏掉transform中点",
    nextLoopBoundary(12000, 12000, 0, normal) === 15000
      && Math.abs(nextLoopBoundary(2520, 9000, 0, glint) - 3060) < 0.0001
      && Math.abs(nextLoopBoundary(6120, 9000, 0, glint) - 7560) < 0.0001);
  check("角色浮动保留原1步曲线的大/小尺寸关键帧边界",
    JSON.stringify(loopOffsets("goose-cs-float-lg")) === "[0,0.25,0.5,0.75,1]"
      && JSON.stringify(loopOffsets("goose-cs-float-sm")) === "[0,0.5,1]");
  check("单眨与双眨的开眼/闭眼帧严格互补，周期末尾恢复初始帧",
    ["goose-cs-blink", "goose-cs-blink-open"].every((name) => JSON.stringify(loopOffsets(name)) === "[0,0.98,1]")
      && ["goose-cs-blink-twice", "goose-cs-blink-twice-open"].every((name) => JSON.stringify(loopOffsets(name)) === "[0,0.94,0.96,0.98,1]")
      && nextLoopBoundary(6860, 7000, 0, loopOffsets("goose-cs-blink")) === 7000
      && nextLoopBoundary(7000, 7000, 0, loopOffsets("goose-cs-blink")) === 13860);

  const shared = harness(), writes: number[][] = Array.from({ length: 100 }, () => []);
  const controls = writes.map((values) => shared.clock.add({
    time: 0, duration: 12000, delay: -6000, offsets: normal, write(time) { values.push(time); },
  }));
  shared.clock.batch(() => { for (const control of controls) control.setActive(true); });
  check("一百个循环共用一个定时器", shared.timers.size === 1);
  shared.advance(2999);
  check("未到阶跃边界不执行循环JS更新", writes.every((values) => JSON.stringify(values) === "[0]"));
  shared.advance(3000);
  check("同一边界批量推进所有循环且只安排下一次唤醒",
    writes.every((values) => JSON.stringify(values) === "[0,3000]") && shared.timers.size === 1);
  shared.advance(100000);
  check("主线程延迟只取最新逻辑相位，不逐帧补跑",
    writes.every((values) => JSON.stringify(values) === "[0,3000,100000]") && shared.timers.size === 1);
  shared.clock.batch(() => { for (const control of controls) control.remove(); });
  check("最后一个循环清理后没有定时器", shared.timers.size === 0);

  const paused = harness(), values: number[] = [];
  const control = paused.clock.add({ time: 0, duration: 12000, delay: -6000, offsets: normal, write(time) { values.push(time); } });
  control.setActive(true);
  paused.advance(3500);
  control.setActive(false);
  const held = control.time(), count = values.length;
  paused.advance(10000);
  check("不可见时冻结逻辑相位、取消唤醒且不写动画",
    held === 3500 && control.time() === held && values.length === count && paused.timers.size === 0);
  control.setActive(true);
  paused.advance(12499);
  const beforeBoundary = values.length;
  paused.advance(12500);
  check("恢复后仅经过剩余边界时间继续，隐藏时长不补入循环",
    values.length === beforeBoundary + 1 && values.at(-1) === 6000 && control.time() === 6000);
  control.remove();
  check("单独清理立即撤掉剩余唤醒", paused.timers.size === 0);

  const sparse = harness();
  let inactiveWrites = 0, activeWrites = 0;
  const inactive = Array.from({ length: 10000 }, () => sparse.clock.add({
    time: 123, duration: 12000, delay: -6000, offsets: normal, write() { inactiveWrites++; },
  }));
  const visible = sparse.clock.add({ time: 0, duration: 12000, delay: -6000, offsets: normal, write() { activeWrites++; } });
  check("大量离屏控制器不会创建唤醒", sparse.timers.size === 0);
  visible.setActive(true);
  sparse.advance(3000);
  check("只有可见循环推进，离屏逻辑时间与写次数保持不变",
    inactive.every((item) => item.time() === 123) && inactiveWrites === 0 && activeWrites === 2 && sparse.timers.size === 1);
  visible.remove();
  check("可见循环清理后，大量离屏控制器仍无唤醒", sparse.timers.size === 0);

  const lifecycle = await lifecycleFixture();
  check("display:none取消后先保存旧对象相位，再恢复同目标的新CSSAnimation", lifecycle.restored);
  check("角色无float时仍接管现有眨眼，离屏恢复不计入隐藏时长", lifecycle.blinking);
  const loading = await loadingFixture();
  check("可见入口共享一次惰性加载，只注册加载完成时仍活跃的目标", loading.loadedOnce);
  check("加载完成后的暂停/释放/恢复同步委派，不再排队", loading.synchronous);
  check("加载失败下次可重试，已暂停或卸载目标不会被迟到注册", loading.retried);

  const root = process.cwd();
  const scheduler = readFileSync(path.join(root, "src/components/ui/dot-matrix/dotLoopScheduler.ts"), "utf8");
  const hook = readFileSync(path.join(root, "src/components/ui/dot-matrix/useDotMotion.ts"), "utf8");
  check("调度仅接管白名单无限循环，入场与短促错误反馈仍由CSS驱动",
    scheduler.includes('timing?.iterations !== Infinity') && !scheduler.includes('"goose-dm-enter"')
      && !scheduler.includes('"goose-dm-shake"') && scheduler.includes('animation.pause();'));
  check("只在注册插画内按需发现，动态组复用共享观察器而非全局扫描",
    scheduler.includes('root.el.getAnimations({ subtree: true })') && scheduler.includes('new MutationObserver')
      && scheduler.includes('childList: true') && !scheduler.includes('document.querySelector')
      && !scheduler.includes('requestAnimationFrame') && !scheduler.includes('setInterval'));
  check("入口保留离屏/文档隐藏/减少动态/Activity的暂停与释放",
    hook.includes('pauseDotLoops(el);') && hook.includes('releaseDotLoops(el);')
      && hook.includes('resumeDotLoops(el);') && hook.includes('document.hidden')
      && hook.includes('onMotionPreferenceChange') && hook.includes('return () => {\n    releaseDotLoops(el);'));
  return checker.failed;
}
