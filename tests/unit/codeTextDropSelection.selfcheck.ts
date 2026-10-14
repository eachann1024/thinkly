import assert from "node:assert/strict";
import { TextSelection } from "prosemirror-state";
import { gooseCodeTextDropExtension } from "../../src/components/editor/extensions/codeTextDropExtension";

const listeners = new Map<string, (event: any) => void>();
const dom = { addEventListener: (name: string, listener: (event: any) => void) => listeners.set(`dom:${name}`, listener) };
const documentListeners = new Map<string, (event: any) => void>();
const originalDocument = globalThis.document;
const originalWindow = globalThis.window;
const originalElement = globalThis.Element;
class FakeElement {
  closest(selector: string) { return selector === ".bn-inline-content" ? this : null; }
}
Object.assign(globalThis, {
  Element: FakeElement,
  document: { addEventListener: (name: string, listener: (event: any) => void) => documentListeners.set(name, listener) },
  window: { getSelection: () => ({ toString: () => "selected text" }) },
});

try {
  let prevented = false;
  let dispatched = 0;
  let docVersion = 1;
  const doc = { eq: (other: unknown) => other === doc && docVersion === 1 };
  const fromParent = {};
  const toParent = {};
  const selection = Object.create(TextSelection.prototype);
  Object.defineProperties(selection, {
    empty: { value: false }, from: { value: 2 }, to: { value: 8 },
    $from: { value: { parent: fromParent } }, $to: { value: { parent: toParent } },
  });
  const view = {
    state: { selection, doc, tr: {} },
    posAtCoords: () => ({ pos: 4 }),
    dispatch: () => { dispatched++; },
    focus() {}, dragging: null,
  };
  const extension = gooseCodeTextDropExtension()({ editor: { prosemirrorView: view } } as any);
  extension.mount({ dom, signal: new AbortController().signal } as any);

  listeners.get("dom:mousedown")!({
    button: 0, target: new FakeElement(), clientX: 10, clientY: 10,
    preventDefault() { prevented = true; },
  });
  assert.equal(prevented, false, "selected-text mousedown remains native");
  documentListeners.get("mouseup")!({ clientX: 30, clientY: 10, target: new FakeElement() });
  assert.equal(dispatched, 0, "mouseup outside code does not alter the document");

  listeners.get("dom:mousedown")!({
    button: 0, target: new FakeElement(), clientX: 10, clientY: 10,
    preventDefault() { prevented = true; },
  });
  docVersion++;
  const changedTarget = new FakeElement();
  changedTarget.closest = () => { throw new Error("stale drag must stop before resolving a drop target"); };
  documentListeners.get("mouseup")!({ clientX: 30, clientY: 10, target: changedTarget });
  assert.equal(dispatched, 0, "document changes invalidate the saved drag");
} finally {
  Object.assign(globalThis, { document: originalDocument, window: originalWindow, Element: originalElement });
}
