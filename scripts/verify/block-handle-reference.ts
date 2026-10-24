import { observeBlockHandleReference } from "@/components/editor/core/useBlockHandleReference";
import { createChecker } from "./lib/check";

export default function run() {
  const checker = createChecker();
  const { check } = checker;
  const globals = globalThis as unknown as Record<string, unknown>;
  const saved = new Map(["window", "document", "CSS", "DOMRect", "ResizeObserver", "MutationObserver"].map((key) => [key, globals[key]]));
  let resize = () => {};
  let mutate = () => {};
  let resizeDisconnected = false, mutationDisconnected = false;
  const observed = new Set<unknown>();
  globals.window = new EventTarget();
  globals.document = new EventTarget();
  globals.CSS = { escape: (id: string) => id };
  globals.DOMRect = class {
    constructor(public x: number, public y: number, public width: number, public height: number) {}
    get left() { return this.x; }
    get top() { return this.y; }
  };
  globals.ResizeObserver = class {
    constructor(callback: () => void) { resize = callback; }
    observe(node: unknown) { observed.add(node); }
    unobserve(node: unknown) { observed.delete(node); }
    disconnect() { resizeDisconnected = true; observed.clear(); }
  };
  globals.MutationObserver = class {
    constructor(callback: () => void) { mutate = callback; }
    observe() {}
    disconnect() { mutationDisconnected = true; }
  };
  const content = (top: number) => ({
    isConnected: true, top, width: 500, height: 28,
    closest: () => block,
    getBoundingClientRect() { return { left: 240, top: this.top, width: this.width, height: this.height }; },
    querySelector() { return null; },
  });
  let live = content(127.75);
  let available = true;
  const block = { querySelectorAll: () => [live], closest: () => null, parentElement: null };
  const root = {
    querySelector: () => available ? block : null,
    contains: (node: unknown) => node === live && live.isConnected,
    closest: () => null,
    firstElementChild: { getBoundingClientRect: () => ({ left: 240 }) },
  };
  const measurements: number[] = [];
  let stop = () => {};
  try {
    stop = observeBlockHandleReference({ prosemirrorView: { dom: root } } as any, "same-block", (reference) => measurements.push(reference.position.top));
    check("初次读取当前块真实位置", measurements.at(-1) === 127.75 && observed.has(live));
    const old = live;
    old.isConnected = false;
    old.top = 0; old.width = 0; old.height = 0;
    live = content(245);
    resize();
    check("旧节点尺寸回调重新读取活节点并换绑监听", measurements.at(-1) === 245 && !observed.has(old) && observed.has(live));
    const count = measurements.length;
    mutate(); resize();
    check("相同几何不重复提交状态", measurements.length === count);
    live.width = 0; live.height = 0;
    mutate();
    check("隐藏节点零尺寸不覆盖有效位置", measurements.length === count && measurements.at(-1) === 245);
    available = false;
    resize();
    check("短暂缺失或脱离节点不归零", measurements.length === count);
    available = true;
    live = content(310);
    mutate();
    check("NodeView替换通过结构变化同步位置", measurements.at(-1) === 310 && observed.has(live));
    stop();
    check("卸载清理尺寸和节点替换监听", resizeDisconnected && mutationDisconnected && observed.size === 0);
  } finally {
    stop();
    for (const [key, value] of saved) {
      if (value === undefined) delete globals[key];
      else globals[key] = value;
    }
  }
  return checker.failed;
}
