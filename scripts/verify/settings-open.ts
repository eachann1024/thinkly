import { readFileSync } from "node:fs";
import path from "node:path";
import { hostRuntime } from "@/lib/host/runtime.electron";
import { flushSettingsContentChange } from "@/components/editor/core/settingsContentFlush";
import { createChecker } from "./lib/check";

const MONOLITH = "thinkly:web-db";
const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

function memoryStorage() {
  const values = new Map<string, string>();
  let reads = 0;
  let readBytes = 0;
  let writes = 0;
  let writeBytes = 0;
  return {
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
    values,
  };
}

export default function run(): number {
  const checker = createChecker();
  const dialog = read("src/pages/workspace/components/sidebar/settings-dialog/useSettingsDialogState.tsx");
  const dataPanel = read("src/pages/workspace/components/sidebar/settings/data-panel/useDataPanelState.tsx");
  const fonts = read("src/pages/workspace/components/shared/LocalFontSelect.tsx");
  const commit = read("src/components/editor/core/useEditorContentCommit.ts");
  const fontEffect = fonts.slice(fonts.indexOf("useEffect(() => {"));
  checker.check(
    "设置页打开时不订阅全部笔记",
    !dialog.includes("usePages(") && !dialog.includes("s.pages") &&
      !dataPanel.includes("usePages(") && !dataPanel.includes("useNotebooks(") &&
      !/useSettings\(\)/.test(dataPanel),
  );
  checker.check(
    "本机字体只在打开菜单时读取",
    fontEffect.startsWith("useEffect(() => {\n    if (!open) return;") &&
      fontEffect.includes("return () => {\n      active = false;\n    };"),
  );
  checker.check(
    "设置卸载走绘制后的刷新",
    /afterPaint: true/.test(commit) && commit.includes("flushSettingsContentChange"),
  );

  const storage = memoryStorage();
  (globalThis as { window?: { localStorage: typeof storage } }).window = { localStorage: storage };
  const db: Record<string, { _id: string; _rev: string; data: { content: string } }> = {};
  const body = "x".repeat(20000);
  for (let i = 0; i < 1500; i += 1) {
    const id = `gn:page:${i}`;
    db[id] = { _id: id, _rev: "1-seed", data: { content: body } };
  }
  const monolith = JSON.stringify(db);
  storage.values.set(MONOLITH, monolith);
  storage.reset();
  const unchanged = flushSettingsContentChange({
    pending: true,
    signature: "same",
    persistedSignature: "same",
    persist: () => {
      const current = hostRuntime.db.get<{ content: string }>("gn:page:3");
      hostRuntime.db.put("gn:page:3", current?.data ?? { content: body }, current?._rev);
    },
  });
  checker.check(
    "内容没变时打开设置不写库",
    unchanged === "skipped" && storage.writes === 0 && storage.writeBytes === 0 && storage.reads === 0,
    `reads ${storage.reads} writes ${storage.writes} writeBytes ${storage.writeBytes}`,
  );

  storage.reset();
  let queued: (() => void) | null = null;
  const changed = flushSettingsContentChange({
    pending: true,
    signature: "edited",
    persistedSignature: "same",
    schedule: (task) => { queued = task; },
    persist: () => {
      const current = hostRuntime.db.get<{ content: string }>("gn:page:3");
      hostRuntime.db.put("gn:page:3", {
        ...current?.data,
        content: `${body}!`,
      }, current?._rev);
    },
  });
  const syncWrites = storage.writes;
  queued?.();
  checker.check(
    "内容变了仍整库重写，但不是在点击当时",
    changed === "scheduled" && syncWrites === 0 && queued !== null &&
      storage.writes >= 1 && storage.writeBytes > monolith.length / 2,
    `syncWrites ${syncWrites} laterWrites ${storage.writes} writeBytes ${storage.writeBytes}`,
  );
  return checker.failed;
}
