/**
 * 末尾块下方的加号：在文末补空行并打开块菜单，复用已有空行，标题不复用；
 * 菜单没选就关掉时只撤掉本次补的、仍为空且光标已离开的空行。
 * 运行：node scripts/verify/run.mjs trailing-add
 */
import { BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import {
  discardUntouchedTrailingBlock,
  openTrailingBlockMenu,
} from "@/components/editor/core/trailingBlockAdd";
import { createChecker } from "./lib/check";

type Opened = { trigger?: string };

function create(initialContent: any[]) {
  const editor = BlockNoteEditor.create({ initialContent });
  const opened: Opened = {};
  const menu = editor.getExtension(SuggestionMenu) as any;
  menu.openSuggestionMenu = (trigger: string) => { opened.trigger = trigger; };
  menu.shown = () => false;
  let focused = true;
  let viewHasFocus = () => focused;
  const view = { isDestroyed: false, hasFocus: () => viewHasFocus() };
  Object.defineProperty(editor, "prosemirrorView", { get: () => view, configurable: true });
  (editor as any).focus = () => {};
  return {
    editor,
    opened,
    blur() { focused = false; },
  };
}

export default async function run(): Promise<number> {
  const checker = createChecker();

  {
    const { editor, opened } = create([
      { type: "heading", props: { level: 1 }, content: "标题" },
      { type: "table", content: { type: "tableContent", rows: [{ cells: ["a", "b"] }] } },
    ]);
    const id = openTrailingBlockMenu(editor);
    const last = editor.document.at(-1)!;
    checker.check("末尾是表格时在其后补空段落并打开 / 菜单", Boolean(id) && last.id === id && last.type === "paragraph" && opened.trigger === "/");
    checker.check("光标落在新空行", editor.getTextCursorPosition().block.id === id);

    discardUntouchedTrailingBlock(editor, id!);
    checker.check("菜单关闭但光标仍在空行（Esc）时保留空行", editor.document.at(-1)!.id === id);

    editor.setTextCursorPosition(editor.document[0], "end");
    discardUntouchedTrailingBlock(editor, id!);
    checker.check("光标移走后撤掉未使用的空行", editor.document.length === 2 && editor.document.at(-1)!.type === "table");
  }

  {
    const { editor, opened } = create([
      { type: "heading", props: { level: 1 }, content: "标题" },
      { type: "paragraph", content: "正文" },
      { type: "paragraph" },
    ]);
    const lastId = editor.document.at(-1)!.id;
    const id = openTrailingBlockMenu(editor);
    checker.check("末尾已有空段落时复用，不再新增", id === undefined && editor.document.length === 3 && opened.trigger === "/");
    checker.check("复用时光标落在那行空段落", editor.getTextCursorPosition().block.id === lastId);
  }

  {
    const titleOnly = create([{ type: "heading", props: { level: 1 }, content: "" }]);
    const id = openTrailingBlockMenu(titleOnly.editor);
    checker.check("只有标题时在标题后新增正文行", Boolean(id) && titleOnly.editor.document.length === 2);
  }

  {
    const { editor, blur } = create([{ type: "paragraph", content: "正文" }]);
    const id = openTrailingBlockMenu(editor)!;
    editor.updateBlock(id, { type: "heading", props: { level: 2 } });
    blur();
    discardUntouchedTrailingBlock(editor, id);
    checker.check("选了别的块类型后不撤销", editor.getBlock(id)?.type === "heading");

    const typed = create([{ type: "paragraph", content: "正文" }]);
    const typedId = openTrailingBlockMenu(typed.editor)!;
    typed.editor.updateBlock(typedId, { content: "查询词" });
    typed.blur();
    discardUntouchedTrailingBlock(typed.editor, typedId);
    checker.check("空行里已输入文字时不撤销", Boolean(typed.editor.getBlock(typedId)));

    const blurred = create([{ type: "paragraph", content: "正文" }]);
    const blurredId = openTrailingBlockMenu(blurred.editor)!;
    blurred.blur();
    discardUntouchedTrailingBlock(blurred.editor, blurredId);
    checker.check("编辑器失焦后撤掉未使用的空行", !blurred.editor.getBlock(blurredId));
  }

  {
    const { editor, opened } = create([{ type: "paragraph", content: "正文" }]);
    (editor.getExtension(SuggestionMenu) as any).shown = () => true;
    const before = editor.document.length;
    const id = openTrailingBlockMenu(editor);
    checker.check("菜单已打开时不重复补行", id === undefined && editor.document.length === before && !opened.trigger);
  }

  return checker.failed;
}
