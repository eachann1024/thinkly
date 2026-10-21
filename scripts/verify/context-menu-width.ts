/**
 * 侧栏右键菜单：Windows 长快捷键不把标签截成省略号，宽度随内容增长；
 * macOS 短快捷键停在最小宽度。
 * 运行：node scripts/verify/run.mjs context-menu-width
 */
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { formatShortcut, type PlatformKind } from "@/lib/utils";
import { createChecker } from "./lib/check";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const LABELS = [
  ["用默认程序打开", "Mod+Shift+A"],
  ["在资源管理器中打开", "Mod+Shift+F"],
  ["复制文件路径", "Mod+Shift+C"],
] as const;

type RowMeasure = {
  text: string;
  shortcut: string;
  client: number;
  scroll: number;
  truncated: boolean;
  overflow: string;
};
type MenuMeasure = {
  width: number;
  left: number;
  remaining: number;
  labels: RowMeasure[];
};

function firstString(file: string, key: string) {
  return read(file).match(new RegExp(`${key}:\\s*"([^"]+)"`))?.[1] ?? "";
}

function chromeBin() {
  for (const name of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    try {
      execFileSync("which", [name], { stdio: "ignore" });
      return name;
    } catch {
      /* 继续找下一个可执行文件 */
    }
  }
  return null;
}

function row(label: string, shortcut: string) {
  return `<button type="button" class="goose-menu-item w-full" data-goose-menu-slot="row"><svg viewBox="0 0 16 16" aria-hidden="true"></svg><span class="min-w-0 truncate" data-label>${label}</span><span class="goose-menu-shortcut" data-shortcut>${shortcut}</span></button>`;
}

function menu(id: string, rows: string, style: string) {
  return `<div id="${id}" class="goose-menu-surface goose-sidebar-context-menu overflow-y-auto" data-goose-menu-slot="root" style="${style}"><div data-goose-menu-slot="group">${rows}</div></div>`;
}

function fixture(minWidth: number, sidebarCss: string, sections: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
:root {
  --goose-menu-min-width: ${minWidth}px;
  --goose-menu-item-height: 32px;
  --goose-menu-item-font-size: 14px;
  --goose-menu-item-line-height: 20px;
  --goose-menu-content-gap: 8px;
  --goose-menu-surface-inset: 6px;
  --goose-menu-row-gap: 2px;
  --muted-foreground: 0 0% 45%;
  --goose-menu-border: 0 0% 86%;
}
body { margin: 0; font-family: "Inter Variable", -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", "WenQuanYi Micro Hei", "Segoe UI", sans-serif; }
@layer utilities {
  .min-w-0 { min-width: 0px; }
  .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .w-full { width: 100%; }
  .overflow-y-auto { overflow-y: auto; }
}
.goose-menu-surface {
  box-sizing: border-box;
  max-width: calc(100vw - 16px);
  min-width: min(var(--goose-menu-min-width), calc(100vw - 24px));
  padding: var(--goose-menu-surface-inset);
  border: 1px solid hsl(var(--goose-menu-border));
  font-size: var(--goose-menu-item-font-size);
  line-height: var(--goose-menu-item-line-height);
}
.goose-menu-item {
  box-sizing: border-box;
  min-height: var(--goose-menu-item-height);
  gap: var(--goose-menu-content-gap);
  padding-inline: var(--goose-menu-content-gap);
  font-size: var(--goose-menu-item-font-size);
  line-height: var(--goose-menu-item-line-height);
}
.goose-menu-shortcut {
  margin-inline-start: auto;
  flex-shrink: 0;
  font-size: 12px;
  line-height: 18px;
}
.goose-menu-item > svg { width: 16px; height: 16px; flex-shrink: 0; }
:is([data-goose-menu-slot="root"], [data-goose-menu-slot="group"]) {
  display: flex;
  flex-direction: column;
  gap: var(--goose-menu-row-gap);
}
${sidebarCss}
</style></head><body>${sections}<script>
const pack = (id) => {
  const root = document.getElementById(id);
  const box = root.getBoundingClientRect();
  return {
    width: box.width,
    left: box.left,
    remaining: window.innerWidth - box.left,
    labels: [...root.querySelectorAll("[data-label]")].map((el) => ({
      text: el.textContent,
      shortcut: el.parentElement.querySelector("[data-shortcut]").textContent,
      client: el.clientWidth,
      scroll: el.scrollWidth,
      truncated: el.scrollWidth > el.clientWidth + 1,
      overflow: getComputedStyle(el).textOverflow,
    })),
  };
};
document.body.dataset.result = JSON.stringify({
  windows: pack("windows"),
  mac: pack("mac"),
  longer: pack("longer"),
  short: pack("short"),
  edge: pack("edge"),
});
</script></body></html>`;
}

function measure(html: string): Promise<Record<string, MenuMeasure>> {
  const bin = chromeBin();
  if (!bin) return Promise.reject(new Error("找不到 Chrome"));
  const dir = mkdtempSync(path.join(tmpdir(), "menu-width-"));
  const file = path.join(dir, "index.html");
  writeFileSync(file, html);
  return new Promise((resolve, reject) => {
    const child = spawn(bin, [
      "--headless=old",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--virtual-time-budget=1000",
      "--window-size=900,700",
      "--dump-dom",
      file,
    ], { stdio: ["ignore", "pipe", "ignore"] });
    let buf = "";
    let done = false;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Chrome 超时"));
    }, 15000);
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill("SIGKILL");
      const match = buf.match(/data-result="([^"]*)"/);
      if (!match) {
        reject(new Error("没有量到菜单"));
        return;
      }
      const json = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&");
      resolve(JSON.parse(json) as Record<string, MenuMeasure>);
    };
    child.stdout.on("data", (chunk) => {
      buf += chunk.toString();
      if (buf.includes("data-result=") && buf.includes("</html>")) finish();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", () => {
      if (buf.includes("data-result=")) finish();
    });
  });
}

function rowsFor(platform: PlatformKind) {
  return LABELS.map(([label, shortcut]) => row(label, formatShortcut(shortcut, platform))).join("");
}

function near(actual: number, expected: number) {
  return Math.abs(actual - expected) < 1.5;
}

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const sidebarCss = read("src/pages/workspace/components/sidebar/sidebar-context-menu.css");
  const tokens = read("src/styles/global/control-tokens.css");
  const minWidth = Number(tokens.match(/--goose-menu-min-width:\s*(\d+)px/)?.[1]);
  const menuSources = [
    "src/pages/workspace/components/sidebar/SidebarContextMenu.tsx",
    "src/pages/workspace/components/sidebar/sidebar-context-menu/SidebarMoveSubmenu.tsx",
    "src/pages/workspace/components/sidebar/main-tree/SidebarMainTree.tsx",
  ].map(read).join("\n");
  const shared = read("src/pages/workspace/components/sidebar/sidebar-context-menu/shared.tsx");
  const openGroups = read("src/pages/workspace/components/sidebar/sidebar-context-menu/groups/appendSidebarOpenMoveGroups.tsx");
  const shortcuts = read("src/lib/local-folder-file-actions.ts");

  console.log("· 样式契约");
  check("菜单宽度是 max-content", /\.goose-sidebar-context-menu\s*\{[^}]*width:\s*max-content/.test(sidebarCss));
  check("带快捷键的标签取消省略号", sidebarCss.includes("text-overflow: clip") && sidebarCss.includes("min-width: max-content"));
  check("侧栏菜单不再写死宽度", !/goose-sidebar-context-menu[^"\n]*w-\[var\(--goose-menu-min-width\)\]/.test(menuSources) && !/goose-sidebar-context-menu w-48/.test(menuSources));
  check("最小宽度仍是 224", minWidth === 224, minWidth);
  check("文案是完整的三项", firstString("src/pages/workspace/components/sidebar/sidebar-context-menu/shared.tsx", "openWithDefaultApp_8869") === LABELS[0][0] && shared.includes(`openExplorer: "${LABELS[1][0]}"`) && openGroups.includes(`copyFilePath_87f5: "${LABELS[2][0]}"`));
  check("快捷键仍是 Mod+Shift", shortcuts.includes('openInExternalApp: "Mod+Shift+A"') && shortcuts.includes('revealInFileManager: "Mod+Shift+F"') && shortcuts.includes('copyFilePath: "Mod+Shift+C"'));

  const windowsShortcuts = LABELS.map(([, shortcut]) => formatShortcut(shortcut, "windows"));
  const macShortcuts = LABELS.map(([, shortcut]) => formatShortcut(shortcut, "mac"));
  check("Windows 快捷键是 Ctrl + Shift + 字母", windowsShortcuts.every((item) => /^Ctrl \+ Shift \+ [A-Z]$/.test(item)), windowsShortcuts);
  check("macOS 快捷键更短", macShortcuts.every((item, index) => item.length < windowsShortcuts[index].length), { macShortcuts, windowsShortcuts });

  console.log("· 排版");
  const html = fixture(minWidth, sidebarCss, [
    menu("windows", rowsFor("windows"), "position:fixed;top:8px;left:8px"),
    menu("mac", rowsFor("mac"), "position:fixed;top:8px;left:8px"),
    menu("longer", row(LABELS[1][0], formatShortcut("Mod+Shift+Insert", "windows")), "position:fixed;top:8px;left:8px"),
    menu("short", row("重命名", formatShortcut("F2", "windows")), "position:fixed;top:8px;left:8px"),
    menu("edge", rowsFor("windows"), "position:fixed;top:8px;left:calc(100vw - 40px)"),
  ].join(""));
  let laid: Record<string, MenuMeasure>;
  try {
    laid = await measure(html);
  } catch (error) {
    check("量到菜单宽度", false, error instanceof Error ? error.message : String(error));
    return checker.failed;
  }

  const windows = laid.windows;
  const mac = laid.mac;
  for (const [index, [label]] of LABELS.entries()) {
    const item = windows.labels[index];
    check(`「${label}」不被截断`, !!item && item.text === label && !item.truncated && item.overflow !== "ellipsis" && !item.text.includes("…"), item);
    check(`「${label}」快捷键完整`, item?.shortcut === windowsShortcuts[index], item?.shortcut);
  }
  check("Windows 菜单宽于最小宽度", windows.width > minWidth, windows.width);
  check("同样的长标签配 macOS 短快捷键停在最小宽度", near(mac.width, minWidth) && mac.labels.every((item) => !item.truncated), mac.width);
  check("macOS 菜单窄于 Windows", mac.width < windows.width, { mac: mac.width, windows: windows.width });
  check("快捷键变长时菜单继续变宽", laid.longer.width > windows.width + 8, { longer: laid.longer.width, windows: windows.width });
  check("短标签不停在内容以下、也不被拉到 Windows 那么宽", near(laid.short.width, minWidth) && laid.short.width < windows.width, laid.short.width);
  check("贴右边沿仍按内容撑开", near(laid.edge.width, windows.width) && laid.edge.width > laid.edge.remaining + 8, laid.edge);

  return checker.failed;
}
