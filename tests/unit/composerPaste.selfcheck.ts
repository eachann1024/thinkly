import assert from "node:assert/strict";
import { insertComposerPlainText } from "../../src/components/editor/ai/composer/composerEditorDom";

const previousWindow = globalThis.window;
const previousDocument = globalThis.document;
const previousNode = globalThis.Node;
try {
  const anchor = { nodeType: 3, parentElement: null } as unknown as Node;
  let content = "@SKILL 1111";
  let caretAfterPaste = false;
  const range = {
    startContainer: anchor,
    endContainer: anchor,
    deleteContents() {},
    insertNode(node: Text) { content += node.textContent; },
    setStartAfter() { caretAfterPaste = true; },
    collapse() {},
  } as unknown as Range;
  const selection = {
    rangeCount: 1,
    getRangeAt: () => range,
    removeAllRanges() {},
    addRange(next: Range) { assert.equal(next, range); },
  } as unknown as Selection;
  Object.assign(globalThis, {
    Node: { ELEMENT_NODE: 1 },
    window: { getSelection: () => selection },
    document: { createTextNode: (text: string) => ({ textContent: text }) },
  });

  assert.equal(insertComposerPlainText(
    { contains: (node: Node) => node === anchor } as HTMLElement,
    "\n## Heading\n- line",
  ), true);
  assert.equal(content, "@SKILL 1111\n## Heading\n- line");
  assert.equal(caretAfterPaste, true);

  const chip = {} as Element;
  const chipText = { nodeType: 3, parentElement: { closest: () => chip } } as unknown as Node;
  const startsAfter: Node[] = [];
  const chipRange = {
    ...range,
    collapsed: true,
    startContainer: chipText,
    endContainer: chipText,
    setStartAfter(node: Node) { startsAfter.push(node); },
  } as Range;
  Object.assign(globalThis, { window: { getSelection: () => ({ ...selection, getRangeAt: () => chipRange, addRange: (next: Range) => assert.equal(next, chipRange) }) } });
  assert.equal(insertComposerPlainText(
    { contains: (node: Node) => node === chipText || node === chip } as HTMLElement,
    " after chip",
  ), true);
  assert.equal(content, "@SKILL 1111\n## Heading\n- line after chip");
  assert.equal(startsAfter[0], chip);
  assert.equal(startsAfter.length, 2);
} finally {
  Object.assign(globalThis, { window: previousWindow, document: previousDocument, Node: previousNode });
}
