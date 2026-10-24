import { readFileSync } from "node:fs";
import path from "node:path";
import {
  DUPLICATE_NAME_LIMIT,
  duplicateSuffixName,
  resolveNotebookWindowTitle,
  withExistingDuplicateSuffix,
} from "../../src/lib/duplicateName";
import { createChecker } from "./lib/check";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const notebook = "锻炼";
  const occupied = Array.from({ length: DUPLICATE_NAME_LIMIT + 1 }, (_, suffix) => duplicateSuffixName(notebook, suffix));

  check("原名就是笔记本名", duplicateSuffixName(notebook, 0) === notebook && withExistingDuplicateSuffix(notebook, []) === notebook);
  check("第一次重名是现有的「 (1)」", duplicateSuffixName(notebook, 1) === `${notebook} (1)` && resolveNotebookWindowTitle(notebook, [notebook], "速记") === `${notebook} (1)`);
  check("（1）也被占用时继续（2）", withExistingDuplicateSuffix(notebook, [notebook, `${notebook} (1)`]) === `${notebook} (2)`);
  check("其它窗口标题不同就不加后缀", resolveNotebookWindowTitle(notebook, ["引体向上(弹力带_自重_负重引体)"], "速记") === notebook);
  check("没有笔记本时回退速记", resolveNotebookWindowTitle("  ", [notebook], "速记") === "速记");
  check("后缀带空格和括号，不是连字符或井号", duplicateSuffixName("笔记", 1) === "笔记 (1)" && !/[-#]/.test(duplicateSuffixName("笔记", 1)));
  check("占满 1 到 99 后不再新造后缀", DUPLICATE_NAME_LIMIT === 99 && withExistingDuplicateSuffix(notebook, occupied) === null);

  const names = read("src/lib/duplicateName.ts");
  const guards = read("src/stores/pages/actions/localFolder/pathGuards.ts");
  const created = read("src/stores/pages/actions/create/localPage.ts");
  const paths = read("src/stores/pages/actions/create/localPaths.ts");
  const save = read("src/stores/quicknote/actions.ts");
  const header = read("src/pages/quick-note/quick-note-app/renderQuickNoteHeader.tsx");
  const switcher = read("src/pages/quick-note/QuickNoteSlotSwitcher.tsx");
  const slots = read("src/pages/quick-note/slot-switcher/quickNoteSlotState.ts");
  const language = read("electron/main/i18n/ipc.ts");
  const entry = read("src/quicknote.tsx");

  check("后缀字符串只定义在一处", names.includes("return `${baseName} (${suffix})`;") && !guards.includes("(${suffix})") && !created.includes("(${suffix})") && !paths.includes("(${suffix})"));
  check("重命名沿用这个后缀", guards.includes("duplicateSuffixName(baseName, suffix)") && guards.includes("suffix <= 99"));
  check("新建笔记沿用这个后缀", created.includes("duplicateSuffixName(normalizedTitle, suffix)") && paths.includes("duplicateSuffixName(normalizedTitle, suffix)"));
  check("保存到笔记用笔记本名", save.includes("const title = notebook.name.trim();") && !save.includes("extractQuickNoteDraftTitle"));
  check("小窗标题显示笔记本窗口名", header.includes("{windowTitle}") && header.includes("data-notebook-window-title={windowTitle}") && !header.includes("{displaySlotName}"));
  check("保存按钮还在", header.includes("handleSaveToNote") && header.includes("FilePlus2"));
  check("速记 1–5 仍是槽位切换", switcher.includes("QUICKNOTE_SLOTS.map") && switcher.includes("{slot}") && slots.includes('rename ? "rename" : "commit"'));
  check("语言切换不再把小窗标题改回速记", !language.includes("getQuicknoteWindow()") && !entry.includes('entryText("title")'));

  return checker.failed;
}
