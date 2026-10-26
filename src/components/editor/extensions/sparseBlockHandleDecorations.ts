import { Fragment, type Node } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

type Entry = { node: Node; pos: number; index: number };
type Target = Entry & { path: Entry[] };
type Branch = { entry: Entry; children: Map<number, Branch> };
const targetsByDocument = new WeakMap<Node, Map<string, Target>>();
const limit = 64;

function findInGroup(entry: Entry, path: Entry[], ids: readonly string[], remember: (entry: Entry, path: Entry[]) => void, missing: Set<string>): boolean {
  const children = entry.node.content.content;
  const first = ids[0];
  const second = ids[1];
  let pos = entry.pos + 1;
  if (second === undefined) {
    for (let index = 0; index < children.length; index += 1) {
      const node = children[index];
      if (node.attrs.id === first) {
        remember({ node, pos, index }, [...path, entry]);
        if (!missing.size) return true;
      }
      pos += 2 + node.content.size;
    }
  } else {
    for (let index = 0; index < children.length; index += 1) {
      const node = children[index];
      const id = node.attrs.id;
      if (id === first || id === second) {
        remember({ node, pos, index }, [...path, entry]);
        if (!missing.size) return true;
      }
      pos += 2 + node.content.size;
    }
  }
  pos = entry.pos + 1;
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (node.content.content.length > 1) {
      const nested = node.lastChild!;
      if (nested.type.name === "blockGroup" && findInGroup({ node: nested, pos: pos + node.content.size - nested.content.size - 1, index: node.childCount - 1 }, [...path, entry, { node, pos, index }], ids, remember, missing)) return true;
    }
    pos += 2 + node.content.size;
  }
  return false;
}

export function sparseBlockHandleTargets(doc: Node, ids: readonly string[]) {
  if (ids.length > 2) {
    const wanted = new Set(ids);
    const blocks: { node: Node; pos: number }[] = [];
    doc.descendants((node, pos) => {
      if (node.type.name === "blockContainer" && wanted.has(node.attrs.id)) blocks.push({ node, pos });
    });
    return sparseBlockDecorationTargetsAtPositions(doc, blocks);
  }
  let cache = targetsByDocument.get(doc);
  if (!cache) { cache = new Map(); targetsByDocument.set(doc, cache); }
  const requested = new Set(ids);
  const missing = new Set(ids.filter(id => !cache.has(id)));
  const root: Entry = { node: doc, pos: -1, index: 0 };
  const remember = (entry: Entry, path: Entry[]) => {
    const id = entry.node.attrs.id as string;
    if (!missing.delete(id)) return;
    if (cache!.size >= limit) {
      for (const cachedId of cache!.keys()) {
        if (!requested.has(cachedId)) { cache!.delete(cachedId); break; }
      }
    }
    cache!.set(id, { ...entry, path });
  };
  const group = doc.firstChild;
  if (group?.type.name === "blockGroup") {
    const path = [root, { node: group, pos: 0, index: 0 }];
    if (group.firstChild) remember({ node: group.firstChild, pos: 1, index: 0 }, path);
    if (group.lastChild) remember({ node: group.lastChild, pos: 1 + group.content.size - group.lastChild.nodeSize, index: group.childCount - 1 }, path);
  }
  const visit = (entry: Entry, path: Entry[]): boolean => {
    const parent = entry.node;
    if (parent.type.name === "blockGroup") return findInGroup(entry, path, ids, remember, missing);
    let pos = entry.pos + 1;
    const children = parent.content.content;
    for (let index = 0; index < children.length; index += 1) {
      const node = children[index];
      if (node.type === doc.type.schema.nodes.blockContainer) {
        if (node.attrs.id === ids[0] || node.attrs.id === ids[1]) {
          remember({ node, pos, index }, [...path, entry]);
          if (!missing.size) return true;
        }
        if (node.content.content.length > 1) {
          const nested = node.lastChild!;
          if (nested.type.name === "blockGroup" && visit({ node: nested, pos: pos + node.content.size - nested.content.size - 1, index: node.childCount - 1 }, [...path, entry, { node, pos, index }])) return true;
        }
        pos += 2 + node.content.size;
      } else {
        if (node.type.name === "blockGroup" && visit({ node, pos, index }, [...path, entry])) return true;
        pos += node.nodeSize;
      }
    }
    return false;
  };
  if (missing.size) visit(root, []);
  return ids.flatMap(id => { const target = cache!.get(id); return target ? [target] : []; });
}

export function mapSparseBlockHandleTargets(transaction: Transaction, ids: readonly string[]) {
  if (!transaction.docChanged) return;
  const previous = targetsByDocument.get(transaction.before);
  if (!previous) return;
  const next = new Map<string, Target>();
  const doc = transaction.doc;
  const group = doc.firstChild;
  for (const id of ids) {
    const target = previous.get(id);
    if (!target) continue;
    const mapped = transaction.mapping.mapResult(target.pos, 1);
    if (mapped.deleted) continue;
    if (group?.type.name === "blockGroup") {
      const node = mapped.pos === 1 ? group.firstChild : mapped.pos === 1 + group.content.size - (group.lastChild?.nodeSize ?? 0) ? group.lastChild : null;
      if (node?.attrs.id === id) {
        next.set(id, { node, pos: mapped.pos, index: mapped.pos === 1 ? 0 : group.childCount - 1,
          path: [{ node: doc, pos: -1, index: 0 }, { node: group, pos: 0, index: 0 }] });
        continue;
      }
    }
    const resolved = doc.resolve(mapped.pos);
    const node = resolved.nodeAfter;
    if (node?.type.name !== "blockContainer" || node.attrs.id !== id) continue;
    const path = Array.from({ length: resolved.depth + 1 }, (_, depth) => ({ node: resolved.node(depth), pos: resolved.start(depth) - 1, index: depth ? resolved.index(depth - 1) : 0 }));
    next.set(id, { node, pos: mapped.pos, index: resolved.index(), path });
  }
  if (next.size) targetsByDocument.set(doc, next);
}

export function sparseBlockDecorationTargetsAtPositions(doc: Node, blocks: readonly { node: Node; pos: number }[]): Target[] {
  return blocks.map(({ node, pos }) => {
    const resolved = doc.resolve(pos);
    const path = Array.from({ length: resolved.depth + 1 }, (_, depth) => ({
      node: resolved.node(depth), pos: resolved.start(depth) - 1, index: depth ? resolved.index(depth - 1) : 0,
    }));
    return { node, pos, index: resolved.index(), path };
  });
}

export function createSparseBlockHandleDecorations(doc: Node, targets: Target[], attributes: (node: Node) => Record<string, string>) {
  if (!targets.length) return DecorationSet.empty;
  const root: Branch = { entry: { node: doc, pos: -1, index: 0 }, children: new Map() };
  for (const target of targets) {
    let branch = root;
    for (const entry of [...target.path.slice(1), target]) {
      let child = branch.children.get(entry.index);
      if (!child) { child = { entry, children: new Map() }; branch.children.set(entry.index, child); }
      branch = child;
    }
  }
  const schema = doc.type.schema;
  const containerType = schema.nodes.blockContainer;
  const paragraphType = schema.nodes.paragraph;
  const groupType = schema.nodes.blockGroup;
  const paddingBySize = new Map<number, Node>();
  const padding = (size: number): Node | null => {
    if (!containerType || !paragraphType || !schema.nodes.text || size < 4 || !Number.isSafeInteger(size)
      || containerType.hasRequiredAttrs() || paragraphType.hasRequiredAttrs()) return null;
    const cached = paddingBySize.get(size);
    if (cached) return cached;
    let children: Node[];
    if (size <= 4100) {
      const text = size > 4 ? schema.text(" ".repeat(size - 4)) : undefined;
      const paragraph = paragraphType.create(null, text);
      if (!paragraphType.validContent(paragraph.content)) return null;
      children = [paragraph];
    } else {
      if (!groupType || groupType.hasRequiredAttrs()) return null;
      const remaining = size - 6;
      const first = padding(Math.floor(remaining / 2));
      const second = padding(Math.ceil(remaining / 2));
      if (!first || !second) return null;
      const group = groupType.create(null, [first, second]);
      if (!groupType.validContent(group.content)) return null;
      children = [paragraphType.create(), group];
    }
    const content = Fragment.fromArray(children);
    if (!containerType.validContent(content)) return null;
    const node = containerType.create({ id: "__goose_decoration_gap__" }, content);
    if (node.nodeSize !== size) return null;
    paddingBySize.set(size, node);
    return node;
  };
  const build = (branch: Branch): Node | null => {
    if (!branch.children.size) return branch.entry.node;
    const { node, pos } = branch.entry;
    if (node.type.name === "blockContainer" && !branch.children.has(0) && node.firstChild) {
      branch.children.set(0, { entry: { node: node.firstChild, pos: pos + 1, index: 0 }, children: new Map() });
    }
    const children: Node[] = [];
    let end = pos + 1;
    for (const child of [...branch.children.values()].sort((a, b) => a.entry.index - b.entry.index)) {
      if (child.entry.pos > end) {
        const gap = padding(child.entry.pos - end);
        if (!gap) return null;
        children.push(gap);
      }
      const built = build(child);
      if (!built) return null;
      children.push(built);
      end = child.entry.pos + child.entry.node.nodeSize;
    }
    const originalEnd = pos + 1 + node.content.size;
    if (end < originalEnd) {
      const gap = padding(originalEnd - end);
      if (!gap) return null;
      children.push(gap);
    }
    return node.copy(Fragment.fromArray(children));
  };
  const windowDoc = build(root);
  const decorations = targets.flatMap(({ node, pos }) => {
    const attrs = attributes(node);
    return Object.keys(attrs).length ? [Decoration.node(pos, pos + node.nodeSize, attrs)] : [];
  });
  return DecorationSet.create(windowDoc?.content.size === doc.content.size ? windowDoc : doc, decorations);
}
