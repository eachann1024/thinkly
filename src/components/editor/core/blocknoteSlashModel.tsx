import { createRoot, type Root } from "react-dom/client";
import {
  CheckSquare,
  Code,
  FileUp,
  GitGraph,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Info,
  List,
  ListOrdered,
  Minus,
  Quote,
  Sigma,
  Sparkles,
  Table,
  Video,
} from "@/components/ui/icons";
import { i18nYaml } from "@/i18n";
const messages = i18nYaml<"src/components/editor/core/blocknoteSlashModel.tsx#messages:1">`
zh-Hans:
  text: "文本"
  heading1: "一级标题"
  heading2: "二级标题"
  checklist: "待办事项"
  bulletedList: "无序列表"
  numberedList: "有序列表"
  toggleHeading1: "折叠一级标题"
  toggleHeading2: "折叠二级标题"
  quote: "引用"
  callout: "标注"
  divider: "分隔线"
  codeBlock: "代码块"
  image: "图片"
en:
  text: "Text"
  heading1: "Heading 1"
  heading2: "Heading 2"
  checklist: "Checklist"
  bulletedList: "Bulleted list"
  numberedList: "Numbered list"
  toggleHeading1: "Toggle heading 1"
  toggleHeading2: "Toggle heading 2"
  quote: "Quote"
  callout: "Callout"
  divider: "Divider"
  codeBlock: "Code block"
  image: "Image"
ja:
  text: "テキスト"
  heading1: "見出し 1"
  heading2: "見出し 2"
  checklist: "ToDo リスト"
  bulletedList: "箇条書きリスト"
  numberedList: "番号付きリスト"
  toggleHeading1: "トグル見出し 1"
  toggleHeading2: "トグル見出し 2"
  quote: "引用"
  callout: "コールアウト"
  divider: "区切り線"
  codeBlock: "コードブロック"
  image: "画像"
`;

export const SLASH_ICONS = {
  sparkles: <Sparkles size={18} />,
  heading1: <Heading1 size={18} />,
  heading2: <Heading2 size={18} />,
  heading3: <Heading3 size={18} />,
  check: <CheckSquare size={18} />,
  list: <List size={18} />,
  listOrdered: <ListOrdered size={18} />,
  quote: <Quote size={18} />,
  info: <Info size={18} />,
  minus: <Minus size={18} />,
  table: <Table size={18} />,
  code: <Code size={18} />,
  sigma: <Sigma size={18} />,
  mermaid: <GitGraph size={18} />,
  image: <Image size={18} />,
  video: <Video size={18} />,
  file: <FileUp size={18} />,
};

let slashIconWarmRoot: Root | null = null;

export function warmupSlashMenuIcons() {
  if (slashIconWarmRoot || typeof document === "undefined") return;
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:0;top:0;width:40px;height:40px;opacity:0;pointer-events:none;overflow:hidden";
  document.body.appendChild(host);
  slashIconWarmRoot = createRoot(host);
  slashIconWarmRoot.render(<div>{Object.values(SLASH_ICONS)}</div>);
}

export interface SlashMenuItem {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  aliases?: string[];
  badge?: string;
  disabled?: boolean;
  disabledReason?: string;
  children?: SlashMenuItem[];
  onItemClick: () => void;
}

export interface SlashMenuFeaturePolicy {
  transcodeVideoUploads: boolean;
  openAttachmentsExternally: boolean;
  localFolderNotebook?: boolean;
}

export function isSlashMenuDivider(item: SlashMenuItem): boolean {
  return (
    typeof item === "object" &&
    item !== null &&
    "type" in item &&
    (item as { type?: string }).type === "divider"
  );
}

export const COMPACT_SLASH_MENU_TITLES = new Set([
  ...Object.values(messages["zh-Hans"]),
  ...Object.values(messages.en),
  ...Object.values(messages.ja),
]);

export function filterCompactSlashMenuItems(
  items: SlashMenuItem[],
): SlashMenuItem[] {
  return items.filter(
    (it) => !isSlashMenuDivider(it) && COMPACT_SLASH_MENU_TITLES.has(it.title),
  );
}

export function filterSlashMenuItems(
  items: SlashMenuItem[],
  query: string,
): SlashMenuItem[] {
  const q = query.trim().toLowerCase();

  if (!q.length) return items;

  const matched = items.filter((item) => {
    if ((item as any).type === "divider") return false;
    const haystacks = [
      item.title,
      item.description ?? "",
      ...(item.aliases ?? []),
    ].map((v) => v.toLowerCase());
    return haystacks.some((v) => v.includes(q));
  });

  return matched;
}
