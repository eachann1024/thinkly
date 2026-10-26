import { readFileSync } from "node:fs";
import path from "node:path";
import { hostRuntime } from "@/lib/host/runtime.electron";
import { createChecker } from "./lib/check";

const MONOLITH = "thinkly:web-db";
const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

function memoryStorage() {
  const values = new Map<string, string>();
  let reads = 0;
  let readBytes = 0;
  let writes = 0;
  let writeBytes = 0;
  const api = {
    getItem(key: string) {
      reads += 1;
      const value = values.get(key);
      if (value !== undefined) readBytes += value.length;
      return value ?? null;
    },
    setItem(key: string, value: string) {
      writes += 1;
      writeBytes += value.length;
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
    reset() {
      reads = 0;
      readBytes = 0;
      writes = 0;
      writeBytes = 0;
    },
    get reads() { return reads; },
    get readBytes() { return readBytes; },
    get writes() { return writes; },
    get writeBytes() { return writeBytes; },
    get values() { return values; },
  };
  return api;
}

export default function run(): number {
  const checker = createChecker();
  const dialog = read("src/pages/workspace/components/sidebar/settings-dialog/useSettingsDialogState.tsx");
  const dataPanel = read("src/pages/workspace/components/sidebar/settings/data-panel/useDataPanelState.tsx");
  const fonts = read("src/pages/workspace/components/shared/LocalFontSelect.tsx");
  const fontEffect = fonts.slice(fonts.indexOf("useEffect(() => {"));
  checker.check(
    "设置对话框不订阅全部笔记",
    !dialog.includes("usePages(") && !dialog.includes("s.pages"),
  );
  checker.check(
    "数据页不订阅全部笔记或整份设置",
    !dataPanel.includes("usePages(") && !dataPanel.includes("useNotebooks(") && !/useSettings\(\)/.test(dataPanel),
  );
  checker.check(
    "本机字体只在打开菜单时读取，关闭时卸下请求",
    fontEffect.startsWith("useEffect(() => {\n    if (!open) return;") &&
      fontEffect.includes("return () => {\n      active = false;\n    };"),
  );

  const storage = memoryStorage();
  const windowRef = globalThis as { window?: { localStorage: typeof storage } };
  windowRef.window = { localStorage: storage };
  const db: Record<string, { _id: string; _rev: string; data: { id: string; content: string } }> = {};
  const body = "x".repeat(4000);
  for (let i = 0; i < 240; i += 1) {
    const id = `gn:page:${i}`;
    db[id] = { _id: id, _rev: "1-seed", data: { id: String(i), content: body } };
  }
  for (let i = 0; i < 480; i += 1) {
    const id = `gn:hist:p:${i}`;
    db[id] = { _id: id, _rev: "1-seed", data: { id: String(i), content: body.slice(0, 800) } };
  }
  const monolith = JSON.stringify(db);
  storage.values.set(MONOLITH, monolith);
  storage.reset();
  hostRuntime.db.allDocs("gn:");
  storage.reset();

  const started = performance.now();
  const current = hostRuntime.db.get<{ content: string }>("gn:page:3");
  const saved = hostRuntime.db.put("gn:page:3", {
    ...current?.data,
    content: `${body}!`,
  }, current?._rev);
  const legacy = hostRuntime.db.allDocs<{ content: string }>("gn:page:");
  const elapsed = performance.now() - started;
  const monolithAfter = storage.values.get(MONOLITH);
  checker.check("打开设置时的保存成功且能读回这一篇", saved.ok === true && hostRuntime.db.get<{ content: string }>("gn:page:3")?.data.content.endsWith("!"));
  checker.check(
    "保存一篇笔记的写入小于 64KB，且不重写整库",
    storage.writeBytes < 64_000 && storage.writeBytes * 20 < monolith.length && monolithAfter === monolith,
    `write ${storage.writeBytes}B / library ${monolith.length}B / ${Math.round(elapsed)}ms`,
  );
  checker.check(
    "热缓存后保存和枚举不再读整库",
    storage.readBytes < 64_000 && storage.readBytes * 20 < monolith.length,
    `read ${storage.readBytes}B`,
  );
  checker.check("旧笔记枚举仍能数全部分页", legacy.length === 240);
  storage.reset();
  const removed = hostRuntime.db.remove("gn:hist:p:1");
  checker.check(
    "删除一篇文档也不重写整库",
    removed.ok === true && storage.values.get(MONOLITH) === monolith && storage.writeBytes < 64_000 && hostRuntime.db.get("gn:hist:p:1") === null,
  );
  return checker.failed;
}
