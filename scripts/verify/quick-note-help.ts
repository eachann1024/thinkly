import { readFileSync } from "node:fs";
import path from "node:path";
import { setLanguageSnapshot } from "../../src/i18n/core";
import { quickNoteHelpLines } from "../../src/pages/quick-note/quickNoteHelpCopy";
import { createChecker } from "./lib/check";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const SLOTS = "顶部 1–5 是五张各自独立的速记。";
const REMOVED = ["保存后会打开主窗口", "侧栏选中会切过去", "这张速记会清空", "This Quick Note is cleared", "このクイックノートは空になります"];

/** 速记说明弹层：两行有序列表，切换快捷键随平台变化，不再写保存与清空。 */
export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;

  setLanguageSnapshot({
    preference: "zh-Hans",
    effectiveLocale: "zh-Hans",
    formatLocale: "zh-CN",
    revision: 1,
  });

  const mac = quickNoteHelpLines("mac");
  const windows = quickNoteHelpLines("windows");
  const linux = quickNoteHelpLines("linux");

  check("第一行是五张各自独立的速记", mac[0] === SLOTS && windows[0] === SLOTS && linux[0] === SLOTS, mac[0]);
  check("macOS 第二行用 ⌘", mac[1] === "⌘1～5 切换速记。", mac[1]);
  check("Windows 第二行用 Ctrl", windows[1] === "Ctrl + 1～5 切换速记。", windows[1]);
  check("Linux 第二行与 Windows 同为 Ctrl", linux[1] === windows[1], linux[1]);
  check("快捷键随平台变化", mac[1] !== windows[1] && mac[1].includes("⌘") && !mac[1].includes("Ctrl") && windows[1].includes("Ctrl") && !windows[1].includes("⌘"));
  const shown = [mac, windows, linux].flat();
  check("说明里没有保存、侧栏或清空", REMOVED.every((sentence) => shown.every((line) => !line.includes(sentence))));

  const header = read("src/pages/quick-note/quick-note-app/renderQuickNoteHeader.tsx");
  const copy = read("src/pages/quick-note/quickNoteHelpCopy.ts");
  const css = read("src/pages/quick-note/styles/overlays.css");
  const sources = `${header}\n${copy}`;
  check("弹层用有序列表排这两行", header.includes('<ol className="quicknote-help-list') && header.includes("{helpSlots}") && header.includes("{helpSwitch}"));
  check("字号滑块仍在", header.includes('id="quicknote-font-size"') && header.includes('type="range"'));
  check("源码已去掉保存与清空说明", REMOVED.every((sentence) => !sources.includes(sentence)));
  check("快捷键复用 formatShortcut，不写死 Ctrl", copy.includes("formatShortcut(") && copy.includes('"Mod+1～5"') && !/["']Ctrl/.test(copy));
  const listRule = css.split(".quicknote-help-list {")[1]?.split("}")[0] ?? "";
  check("列表显示序号", listRule.includes("list-style: decimal") && !listRule.includes("list-style: none"));

  return checker.failed;
}
