/** 主题弹层只排版开头一屏。份量固定，和全文长度无关。 */

const PREVIEW_BLOCK_LIMIT = 16;
const PREVIEW_CHAR_LIMIT = 1800;
const PREVIEW_TABLE_ROWS = 4;
const PREVIEW_TABLE_COLS = 6;
const PREVIEW_DEPTH_LIMIT = 3;

type Budget = { blocks: number; chars: number };

function exhausted(budget: Budget): boolean {
  return budget.blocks >= PREVIEW_BLOCK_LIMIT || budget.chars >= PREVIEW_CHAR_LIMIT;
}

function clipString(value: string, budget: Budget): string {
  const room = PREVIEW_CHAR_LIMIT - budget.chars;
  if (room <= 0) return "";
  const text = value.length > room ? value.slice(0, room) : value;
  budget.chars += text.length;
  return text;
}

function clipInline(content: unknown, budget: Budget): unknown {
  if (typeof content === "string") return clipString(content, budget);
  if (!Array.isArray(content)) return content;
  const out: unknown[] = [];
  for (let i = 0; i < content.length; i += 1) {
    if (budget.chars >= PREVIEW_CHAR_LIMIT) break;
    const part = content[i];
    if (typeof part === "string") {
      out.push(clipString(part, budget));
      continue;
    }
    if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
      const text = clipString((part as { text: string }).text, budget);
      out.push(text === (part as { text: string }).text ? part : { ...(part as object), text });
      continue;
    }
    out.push(part);
  }
  return out;
}

function clipCell(cell: unknown, budget: Budget): unknown {
  if (typeof cell === "string" || Array.isArray(cell)) return clipInline(cell, budget);
  if (!cell || typeof cell !== "object") return cell;
  const record = cell as { text?: unknown; content?: unknown };
  if (typeof record.text === "string") {
    const text = clipString(record.text, budget);
    return text === record.text ? cell : { ...record, text };
  }
  if ("content" in record) {
    const content = clipInline(record.content, budget);
    return content === record.content ? cell : { ...record, content };
  }
  return cell;
}

function clipTable(block: Record<string, unknown>, budget: Budget): Record<string, unknown> {
  budget.blocks += 1;
  const content = block.content;
  if (!content || typeof content !== "object" || !Array.isArray((content as { rows?: unknown }).rows)) {
    return { ...block, children: [] };
  }
  const rows = (content as { rows: unknown[] }).rows;
  const clippedRows: unknown[] = [];
  const rowCount = Math.min(rows.length, PREVIEW_TABLE_ROWS);
  for (let r = 0; r < rowCount; r += 1) {
    if (exhausted(budget)) break;
    const row = rows[r];
    if (!row || typeof row !== "object" || !Array.isArray((row as { cells?: unknown }).cells)) {
      clippedRows.push(row);
      continue;
    }
    const cells = (row as { cells: unknown[] }).cells;
    const clippedCells: unknown[] = [];
    const colCount = Math.min(cells.length, PREVIEW_TABLE_COLS);
    for (let c = 0; c < colCount; c += 1) clippedCells.push(clipCell(cells[c], budget));
    clippedRows.push({ ...(row as object), cells: clippedCells });
  }
  return { ...block, content: { ...(content as object), rows: clippedRows }, children: [] };
}

function clipBlock(block: unknown, budget: Budget, depth: number): Record<string, unknown> | null {
  if (!block || typeof block !== "object" || exhausted(budget)) return null;
  const record = block as Record<string, unknown>;
  if (record.type === "table") return clipTable(record, budget);
  budget.blocks += 1;
  const next: Record<string, unknown> = { ...record };
  if ("content" in record) next.content = clipInline(record.content, budget);
  const children = record.children;
  if (
    depth < PREVIEW_DEPTH_LIMIT &&
    Array.isArray(children) &&
    children.length > 0 &&
    !exhausted(budget)
  ) {
    next.children = clipBlocks(children, budget, depth + 1);
  } else {
    next.children = [];
  }
  return next;
}

function clipBlocks(blocks: unknown[], budget: Budget, depth: number): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    if (exhausted(budget)) break;
    const clipped = clipBlock(blocks[i], budget, depth);
    if (clipped) out.push(clipped);
  }
  return out;
}

export function takeBlocksForPreview(blocks: unknown): Record<string, unknown>[] {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];
  return clipBlocks(blocks, { blocks: 0, chars: 0 }, 0);
}
