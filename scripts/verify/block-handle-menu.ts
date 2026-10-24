import { BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { readFileSync } from "node:fs";
import { editorSchema } from "@/components/editor/core/schema";
import { BLOCK_HANDLE_ICONS, blockHandleCapabilities, isEmptyHandleParagraph } from "@/components/editor/core/blockHandleModel";
import { convertHandleBlock, deleteHandleBlock, insertFromHandle, openEmptyHandleMenu, setHandleBlockProperty } from "@/components/editor/core/blockHandleActions";
import { BLOCK_CONVERSIONS } from "@/components/editor/core/blocknoteCommandSlashItems";
import { blockHandleLeft, blockHandleMenuSide, isPointerInToolbarCorridor } from "@/components/editor/core/blockHandleGeometry";
import { getBlockToolbarOwner, ownsBlockToolbar } from "@/components/editor/core/blockToolbarOwner";
import { createChecker } from "./lib/check";

function create(initialContent: any[]) {
  const editor = BlockNoteEditor.create({ schema: editorSchema, initialContent });
  editor.focus = () => {};
  let opened = 0;
  const menu = editor.getExtension(SuggestionMenu) as any;
  menu.openSuggestionMenu = () => { opened++; };
  menu.shown = () => false;
  return { editor, opened: () => opened };
}

export default function run(): number {
  const checker = createChecker();
  const { check } = checker;
  const mapped = Object.keys(BLOCK_HANDLE_ICONS).sort();
  check("17种已注册块均有类型图标", mapped.length === 17 && JSON.stringify(mapped) === JSON.stringify(Object.keys(editorSchema.blockSchema).sort()));
  const { editor, opened } = create([
    { type: "heading", props: { level: 1 }, content: "标题" },
    { type: "paragraph", content: "原正文" }, { type: "paragraph" },
    { type: "image", props: { url: "/image.png" } },
  ]);
  const [title, body, empty, image] = editor.document;
  const titleCaps = blockHandleCapabilities(editor, title);
  check("首标题允许复制和下插，禁止剪切删除转换与上插", titleCaps.copy && titleCaps.insertAfter && !titleCaps.mutate && !titleCaps.convert && !titleCaps.insertBefore && !titleCaps.draggable);
  check("首标题动作在入口再次保护", !deleteHandleBlock(editor, title.id) && !convertHandleBlock(editor, title.id, BLOCK_CONVERSIONS[0], false) && !insertFromHandle(editor, title.id, "before"));
  check("空段使用加号，正文与图片保持普通把手", isEmptyHandleParagraph(empty) && !isEmptyHandleParagraph(body) && !isEmptyHandleParagraph(image));
  const length = editor.document.length;
  check("空段加号复用本行并打开既有插入菜单", openEmptyHandleMenu(editor, empty.id) && opened() === 1 && editor.document.length === length && editor.getTextCursorPosition().block.id === empty.id);
  check("普通块加号入口不打开菜单", !openEmptyHandleMenu(editor, body.id) && opened() === 1);
  editor.setTextCursorPosition(empty.id);
  check("转换指向把手目标而不是光标", convertHandleBlock(editor, body.id, BLOCK_CONVERSIONS[2], false) && editor.getBlock(body.id)?.type === "heading" && editor.getBlock(empty.id)?.type === "paragraph");
  check("转换保留原文", JSON.stringify(editor.getBlock(body.id)?.content).includes("原正文"));
  check("块颜色与对齐使用既有属性", setHandleBlockProperty(editor, body.id, "textColor", "blue") && setHandleBlockProperty(editor, body.id, "backgroundColor", "pink") && setHandleBlockProperty(editor, body.id, "textAlignment", "center") && editor.getBlock(body.id)?.props.textAlignment === "center");
  check("图片不获得文字颜色与对齐能力", !blockHandleCapabilities(editor, image).color && !blockHandleCapabilities(editor, image).align && !setHandleBlockProperty(editor, image.id, "textColor", "red"));
  const section = { id: "section", type: "columnSection", props: {} };
  const sectionCaps = blockHandleCapabilities(editor, section);
  check("分栏结构列不提供不合法的独立修改和插入动作", !sectionCaps.mutate && !sectionCaps.insertAfter && !sectionCaps.insertBefore && !sectionCaps.convert && !sectionCaps.draggable);
  const inserted = insertFromHandle(editor, body.id, "after");
  const order = editor.document.map((block: any) => block.id);
  check("上下插入围绕目标块定位且打开既有菜单", Boolean(inserted) && order.indexOf(inserted!) === order.indexOf(body.id) + 1 && editor.getTextCursorPosition().block.id === inserted && opened() === 2);
  check("删除仅删除指定块", deleteHandleBlock(editor, inserted!) && !editor.getBlock(inserted!) && Boolean(editor.getBlock(body.id)));
  const viewport = { left: 0, top: 0, right: 800, bottom: 600 };
  check("菜单左侧优先，空间不足向下避让", blockHandleMenuSide({ left: 300, right: 500, top: 10, bottom: 30 }, viewport) === "left" && blockHandleMenuSide({ left: 20, right: 100, top: 10, bottom: 30 }, viewport) === "bottom");
  check("窄栏把手保持可达", blockHandleLeft(10, 44, viewport) === 4 && blockHandleLeft(900, 44, viewport) === 752);
  const media = { left: 100, right: 500, top: 100, bottom: 300 };
  const toolbar = { left: 200, right: 400, top: 60, bottom: 90 };
  check("媒体与工具栏小间隙可穿越，远处不锁住", isPointerInToolbarCorridor(media, toolbar, 250, 95) && !isPointerInToolbarCorridor(media, toolbar, 550, 95) && !isPointerInToolbarCorridor(media, { ...toolbar, bottom: 70 }, 250, 80));
  const menuSource = readFileSync("src/components/editor/core/BlockHandleMenu.tsx", "utf8");
  const sideSource = readFileSync("src/components/editor/core/EditorSideMenu.tsx", "utf8");
  const targetSource = readFileSync("src/components/editor/core/useEditorSideMenuTarget.ts", "utf8");
  const styleMenuSource = readFileSync("src/components/editor/core/BlockHandleStyleMenus.tsx", "utf8");
  check("菜单复用剪贴板及转换能力", menuSource.includes("useEditorContextClipboard") && menuSource.includes("BLOCK_CONVERSIONS"));
  check("空段悬停和点击共用插入入口，菜单锁目标", sideSource.includes("window.setTimeout(openInsert, 180)") && sideSource.includes("onClick={openInsert}") && sideSource.includes("lockedBlockId"));
  check("拖动按钮与press定位触发器分离", menuSource.includes("goose-block-menu-positioner") && menuSource.includes("cloneElement(children") && !menuSource.includes("<DropdownMenuTrigger asChild>{children}"));
  check("空段背景仅由加号悬停或插入菜单保持", sideSource.includes("plusHot || insertMenuId === block.id"));
  const highlightEffect = sideSource.slice(sideSource.indexOf("if (!block || !empty || !shouldShow"), sideSource.indexOf("if (!shouldShow || !referencePos"));
  check("空段插入计时由悬停状态驱动，背景更新不会取消新计时", sideSource.includes("if (plusHot && empty && shouldShow && block && insertMenuId !== block.id)") &&
    sideSource.includes("onPointerEnter={() => { setPlusHot(true); }}") && !highlightEffect.includes("clearHover"));
  const editorA = {}, editorB = {};
  const ownedMenu = { dataset: { gooseBlockId: body.id, gooseEditorOwner: getBlockToolbarOwner(editorA) } };
  check("同块菜单只保持所属分屏把手", ownsBlockToolbar(ownedMenu, editorA, body.id) && !ownsBlockToolbar(ownedMenu, editorB, body.id) && !ownsBlockToolbar(ownedMenu, editorA, empty.id));
  check("所有把手菜单层传递归属并按归属保持", menuSource.includes("data-goose-editor-owner={owner}") && styleMenuSource.includes("data-goose-editor-owner={owner}") && targetSource.includes("ownsBlockToolbar(menu ?? null, editor.prosemirrorView.dom, blockId)"));
  return checker.failed;
}
