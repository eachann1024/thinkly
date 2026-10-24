import { Schema, type Node } from "prosemirror-model";
import { adjacentBlock, findBlockPositions } from "@/components/editor/extensions/blockSelectionModel";
import { createChecker } from "./lib/check";

const schema = new Schema({
  nodes: {
    doc: { content: "blockGroup" },
    blockGroup: { content: "blockContainer+" },
    blockContainer: {
      content: "paragraph blockGroup?",
      attrs: { id: { default: "" } },
    },
    paragraph: { content: "text*" },
    text: { group: "inline" },
  },
});

const paragraph = () => schema.nodes.paragraph.create(null, schema.text("x"));

function block(id: string, children?: Node[]): Node {
  const content = children?.length
    ? [paragraph(), schema.nodes.blockGroup.create(null, children)]
    : paragraph();
  return schema.nodes.blockContainer.create({ id }, content);
}

function scan(doc: Node) {
  const items: { pos: number; size: number }[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "blockContainer") items.push({ pos, size: node.nodeSize });
  });
  return items;
}

function oracle(items: { pos: number; size: number }[], pos: number, size: number, direction: 1 | -1) {
  if (direction > 0) return items.find((item) => item.pos >= pos + size) ?? null;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item.pos + item.size <= pos) return item;
  }
  return null;
}

export default function run() {
  const checker = createChecker();
  const nested = schema.nodes.doc.create(null, schema.nodes.blockGroup.create(null, [
    block("a"),
    block("parent", [block("c1"), block("c2", [block("c2a")])]),
    block("z"),
  ]));
  const items = scan(nested);
  for (const item of items) {
    for (const direction of [1, -1] as const) {
      const next = adjacentBlock(nested, item.pos, item.size, direction);
      const expected = oracle(items, item.pos, item.size, direction);
      checker.check(
        `${direction > 0 ? "下" : "上"}一块与全表扫描一致 @${item.pos}`,
        (next?.pos ?? null) === (expected?.pos ?? null),
      );
    }
  }

  const many = schema.nodes.doc.create(null, schema.nodes.blockGroup.create(null,
    Array.from({ length: 2000 }, (_, index) => block(`b${index}`)),
  ));
  const first = scan(many)[0];
  const started = performance.now();
  let cursor = first;
  let steps = 0;
  while (cursor && steps < 2000) {
    const next = adjacentBlock(many, cursor.pos, cursor.size, 1);
    if (!next) break;
    cursor = { pos: next.pos, size: next.node.nodeSize };
    steps += 1;
  }
  const elapsed = performance.now() - started;
  checker.check("两千块逐个下移总耗时低于 10 毫秒", steps === 1999 && elapsed < 10, `${steps} 步 ${elapsed.toFixed(2)}ms`);

  const positions = findBlockPositions(many, new Set(["b0", "b1999"]));
  checker.check("只按 id 找到首尾块", positions.size === 2 && positions.has("b0") && positions.has("b1999"));
  return checker.failed;
}
