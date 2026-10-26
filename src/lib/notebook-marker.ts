type MarkerFs = Pick<NonNullable<Window["gooseFs"]>,
  "exists" | "existsAsync" | "readFile" | "readFileAsync" | "mkdir" | "createFileAsync">;

export function parseNotebookMarker(text: string): { id: string; [key: string]: unknown } {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("The notebook identity marker is damaged; the original file was preserved."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid notebook identity marker");
  const id = (value as { id?: unknown }).id;
  if (typeof id !== "string" || !id.trim() || id.length > 200 || /[\0\r\n]/.test(id)) throw new Error("Invalid notebook identity marker");
  return value as { id: string; [key: string]: unknown };
}

export async function ensureNotebookMarker(fs: MarkerFs, root: string, fallbackId: string, expectedId?: string): Promise<string> {
  const directory = `${root.replace(/[\\/]+$/, "")}/.goose`;
  const file = `${directory}/notebook.json`;
  const exists = () => fs.existsAsync ? fs.existsAsync(file) : Promise.resolve(fs.exists(file));
  const read = async () => {
    const text = fs.readFileAsync ? await fs.readFileAsync(file) : fs.readFile(file);
    if (text === null) throw new Error("The notebook identity marker could not be read; writing was stopped.");
    const marker = parseNotebookMarker(text);
    if (expectedId && marker.id !== expectedId) throw new Error("The notebook identity changed; writing was stopped.");
    return marker.id;
  };
  if (await exists()) return read();
  if (!fs.createFileAsync) throw new Error("This host cannot create a notebook identity marker safely.");
  const id = expectedId ?? fallbackId;
  parseNotebookMarker(JSON.stringify({ id }));
  if (await fs.mkdir(directory) === false) throw new Error("The notebook metadata directory could not be created.");
  const created = await fs.createFileAsync(file, `${JSON.stringify({ id })}\n`);
  if (!created && !(await exists())) throw new Error("The notebook identity marker could not be created.");
  return read();
}
