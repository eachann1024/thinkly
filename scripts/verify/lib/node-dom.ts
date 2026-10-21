const memory = new Map<string, string>();

function storage() {
  return {
    getItem: (key: string) => (memory.has(key) ? memory.get(key)! : null),
    setItem: (key: string, value: string) => { memory.set(String(key), String(value)); },
    removeItem: (key: string) => { memory.delete(key); },
    clear: () => { memory.clear(); },
    key: (index: number) => [...memory.keys()][index] ?? null,
    get length() { return memory.size; },
  };
}

function element(tag = "div") {
  const node: Record<string, unknown> = {
    tagName: String(tag).toUpperCase(),
    nodeType: 1,
    style: {},
    className: "",
    children: [] as unknown[],
    childNodes: [] as unknown[],
    attributes: {} as Record<string, string>,
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute(name: string, value: string) { (node.attributes as Record<string, string>)[name] = String(value); },
    getAttribute(name: string) { return (node.attributes as Record<string, string>)[name] ?? null; },
    removeAttribute(name: string) { delete (node.attributes as Record<string, string>)[name]; },
    appendChild(child: { parentNode?: unknown }) {
      (node.children as unknown[]).push(child);
      (node.childNodes as unknown[]).push(child);
      if (child) child.parentNode = node;
      return child;
    },
    removeChild(child: unknown) {
      node.children = (node.children as unknown[]).filter((item) => item !== child);
      node.childNodes = (node.childNodes as unknown[]).filter((item) => item !== child);
      return child;
    },
    insertBefore(child: { parentNode?: unknown }) { return (node.appendChild as (child: { parentNode?: unknown }) => unknown)(child); },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    contains() { return false; },
    getBoundingClientRect() { return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() { return {}; } }; },
    focus() {},
    click() {},
    remove() {},
    innerHTML: "",
    textContent: "",
  };
  return node;
}

const documentElement = element("html");
const body = element("body");
const documentStub = {
  documentElement,
  body,
  head: element("head"),
  hidden: false,
  visibilityState: "visible",
  readyState: "complete",
  createElement: (tag: string) => element(tag),
  createElementNS: (_ns: string, tag: string) => element(tag),
  createTextNode: (text: string) => ({ nodeType: 3, textContent: String(text) }),
  createDocumentFragment: () => element("#fragment"),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true; },
  elementFromPoint: () => null,
};

const root = globalThis as typeof globalThis & {
  window: typeof globalThis;
  document: typeof documentStub;
  localStorage: ReturnType<typeof storage>;
  sessionStorage: ReturnType<typeof storage>;
  matchMedia: (query: string) => MediaQueryList;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame: (id: number) => void;
  getComputedStyle: () => CSSStyleDeclaration;
  ResizeObserver: new () => { observe(): void; unobserve(): void; disconnect(): void };
  MutationObserver: new () => { observe(): void; disconnect(): void; takeRecords(): unknown[] };
  IntersectionObserver: new () => { observe(): void; unobserve(): void; disconnect(): void };
};

const windowListeners = new Map<string, Set<(event: Event) => void>>();
root.addEventListener = (type: string, listener: (event: Event) => void) => {
  const listeners = windowListeners.get(type) ?? new Set();
  listeners.add(listener);
  windowListeners.set(type, listeners);
};
root.removeEventListener = (type: string, listener: (event: Event) => void) => {
  windowListeners.get(type)?.delete(listener);
};
root.dispatchEvent = (event: Event) => {
  for (const listener of windowListeners.get(event.type) ?? []) listener(event);
  return true;
};
root.window = root;
root.document = documentStub;
root.localStorage = storage();
root.sessionStorage = storage();
if (!root.navigator) {
  Object.defineProperty(root, "navigator", {
    value: { language: "zh-CN", languages: ["zh-CN"], userAgent: "node", platform: "Linux" },
    configurable: true,
  });
}
root.matchMedia = () => ({ matches: false, media: "", addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false, onchange: null });
root.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0) as unknown as number;
root.cancelAnimationFrame = (id) => clearTimeout(id);
root.getComputedStyle = () => new Proxy({}, { get: () => "" }) as CSSStyleDeclaration;
root.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
root.MutationObserver = class { observe() {} disconnect() {} takeRecords() { return []; } };
root.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
(documentElement as { ownerDocument?: unknown }).ownerDocument = documentStub;
(body as { ownerDocument?: unknown }).ownerDocument = documentStub;
(documentElement.appendChild as (child: unknown) => unknown)(body);
