import { getPlatformKind, type PlatformKind } from "@/lib/utils";
import {
  FIXED_CLOSE_SHORTCUT,
  FIXED_SPLIT_SHORTCUTS,
} from "@/lib/fixed-app-shortcuts";
import { FIXED_SHORTCUTS } from "./shortcutConfig";

export interface ShortcutGroupItem {
  label: string;
  shortcut: string;
}

export interface ShortcutGroup {
  id: string;
  title: string;
  items: ShortcutGroupItem[];
}

export function currentShortcutPlatform(): PlatformKind {
  const platform = getPlatformKind();
  return platform === "other" ? "windows" : platform;
}

export function fixedShortcutsForCurrentPlatform(
  singleTabMode: boolean,
): ShortcutGroup[] {
  const platform = currentShortcutPlatform();
  const visible = FIXED_SHORTCUTS.filter(
    (item) =>
      (!singleTabMode || !item.tabOnly) &&
      (!item.platforms || item.platforms.includes(platform)),
  );
  const take = (...entries: Array<string | [string, string]>) =>
    entries.flatMap((entry) => {
      const [source, label] = Array.isArray(entry) ? entry : [entry, entry];
      const item = visible.find((candidate) => candidate.label === source);
      return item ? [{ label, shortcut: item.shortcut }] : [];
    });

  return [
    {
      id: "notes",
      title: "笔记与窗口",
      items: take(
        "新建笔记",
        "新建窗口",
        "打开设置",
        ["切换侧栏视图（本地 / 大纲 / 搜索）", "切换侧栏"],
        ["侧栏聚焦时收起其它文件夹（优先于关闭笔记）", "收起其他文件夹"],
        ["重命名侧栏页面", "重命名页面"],
        ["删除侧栏选中页面", "删除页面"],
      ),
    },
    {
      id: "tabs",
      title: "标签页",
      items: take(
        ["恢复最近关闭的标签页", "恢复最近关闭的标签"],
        ["切换标签页（4~8 对应序号，9 到最后）", "切换标签页"],
        "循环切换标签页",
        "反向循环切换标签页",
        ["按关闭顺序关闭当前内容（桌面）", "按关闭顺序关闭"],
        ["关闭窗口（macOS）", "关闭窗口"],
      ),
    },
    {
      id: "find",
      title: "查找",
      items: take(
        "页内查找",
        "页内替换",
        "查找下一处",
        "查找上一处",
        ["继续查找（F3）", "继续查找"],
        "反向继续查找",
      ),
    },
    {
      id: "writing",
      title: "编辑",
      items: take(
        ["手动保存（本地文件立即写盘）", "保存"],
        "加粗",
        "斜体",
        "下划线",
        "行内代码",
        "删除线",
        "标题 1～3 级",
        "上移编辑块",
        "下移编辑块",
        ["选区加入 AI 对话（AI 开启时）", "加入 AI 对话"],
        "全选",
        "撤销",
        "重做",
        ["重做（Windows）", "重做"],
        "字号放大",
        "字号缩小",
        "重置字号",
      ),
    },
    {
      id: "files",
      title: "本地文件",
      items: take(
        ["移动本地文件/文件夹", "移动文件或文件夹"],
        ["用外部应用打开当前本地文件", "用其他应用打开"],
        ["在文件管理器中显示当前本地文件", "在文件管理器中显示"],
        ["在终端中打开当前本地文件", "在终端中打开"],
        ["复制当前文件路径", "复制文件路径"],
      ),
    },
  ].filter((group) => group.items.length > 0);
}

export function splitShortcutsForCurrentPlatform(): ShortcutGroupItem[] {
  return [
    ["向右分屏", FIXED_SPLIT_SHORTCUTS.splitRight],
    ["向下分屏", FIXED_SPLIT_SHORTCUTS.splitDown],
    ["焦点移到左侧", FIXED_SPLIT_SHORTCUTS.splitFocusLeft],
    ["焦点移到右侧", FIXED_SPLIT_SHORTCUTS.splitFocusRight],
    ["焦点移到上方", FIXED_SPLIT_SHORTCUTS.splitFocusUp],
    ["焦点移到下方", FIXED_SPLIT_SHORTCUTS.splitFocusDown],
    ["上一个分屏", FIXED_SPLIT_SHORTCUTS.splitFocusPrevious],
    ["下一个分屏", FIXED_SPLIT_SHORTCUTS.splitFocusNext],
    ["最大化当前分屏", FIXED_SPLIT_SHORTCUTS.splitZoom],
    ["关闭当前分屏", FIXED_CLOSE_SHORTCUT],
  ]
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, shortcut]) => ({ label, shortcut }));
}
