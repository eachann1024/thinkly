const readers = new WeakSet<object>();
let paintingTable = false;

export function markProgrammaticRead(editor: object): void {
  readers.add(editor);
  setTimeout(() => readers.delete(editor), 0);
}

export function programmaticRead(editor: object): boolean {
  return readers.has(editor);
}

export function runTableWindowPaint(run: () => void) {
  paintingTable = true;
  try {
    run();
  } finally {
    paintingTable = false;
  }
}

export function tableWindowPaint(): boolean {
  return paintingTable;
}
