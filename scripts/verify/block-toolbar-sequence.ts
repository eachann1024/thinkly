import { readFileSync } from "node:fs";
import { Schema } from "@tiptap/pm/model";
import { EditorState, type Transaction } from "@tiptap/pm/state";
import { blockHandleUiPlugin, blockHandleUiKey, resolveBlockHandleUiDecorations, setBlockHandleUi } from "@/components/editor/extensions/blockHandleUiExtension";
import { createChecker } from "./lib/check";
import {
  BLOCK_HANDLE_TOOLBAR_DELAY,
  startBlockHandleHoverPhase,
} from "@/components/editor/core/useBlockHandleHoverPhase";
import {
  getBlockToolbarState,
  subscribeBlockHover,
  type BlockHoverDetail,
} from "@/components/editor/core/blockToolbarSequence";
import { getBlockToolbarOwner, ownsBlockToolbar } from "@/components/editor/core/blockToolbarOwner";

const read = (path: string) => readFileSync(path, "utf8");

export default function run() {
  const checker = createChecker();
  const { check } = checker;
  const globals = globalThis as unknown as Record<string, unknown>;
  const previousWindow = globals.window;
  let now = 0;
  let timerId = 0;
  const timers = new Map<number, { at: number; run: () => void }>();
  globals.window = {
    setTimeout(run: () => void, delay: number) {
      const id = ++timerId;
      timers.set(id, { at: now + delay, run });
      return id;
    },
    clearTimeout(id: number) { timers.delete(id); },
  };
  const advance = (duration: number) => {
    now += duration;
    for (const [id, timer] of [...timers]) {
      if (timer.at > now) continue;
      timers.delete(id);
      timer.run();
    }
  };
  const root = new EventTarget() as HTMLElement;
  const schema = new Schema({ nodes: {
    doc: { content: "blockContainer+" },
    blockContainer: { content: "paragraph", attrs: { id: { default: null } } },
    paragraph: { content: "text*" }, text: {},
  } });
  const originalDoc = schema.node("doc", null, ["image", "video"].map((id) =>
    schema.node("blockContainer", { id }, [schema.node("paragraph")])));
  const transactions: Transaction[] = [];
  const view = {
    dom: root,
    state: EditorState.create({ schema, doc: originalDoc, plugins: [blockHandleUiPlugin] }),
    dispatch(transaction: Transaction) { transactions.push(transaction); view.state = view.state.apply(transaction); },
  };
  const editor = { prosemirrorView: view };
  const attributes = (id: string) => {
    let position = -1;
    view.state.doc.descendants((node, pos) => { if (node.type.name === "blockContainer" && node.attrs.id === id) position = pos; });
    const decoration = resolveBlockHandleUiDecorations(view.state).find().find((item) => item.from === position);
    return (decoration as any)?.type.attrs ?? {};
  };
  setBlockHandleUi(editor, { enabled: true });
  const events: BlockHoverDetail[] = [];
  const unsubscribe = subscribeBlockHover(root, (detail) => events.push(detail));
  try {
    check("共享工具栏时钟固定为 200ms", BLOCK_HANDLE_TOOLBAR_DELAY === 200);
    let stop = startBlockHandleHoverPhase(editor, "image", false, false);
    check("进入块先显示把手，现有工具栏尚未就绪",
      attributes("image")["data-goose-block-hover"] === "handle" && !getBlockToolbarState(editor, "image").ready);
    advance(199);
    check("199ms 时工具栏仍未出现", !getBlockToolbarState(editor, "image").ready);
    advance(1);
    check("200ms 后同一块才发布工具栏阶段",
      getBlockToolbarState(editor, "image").ready && events.at(-1)?.phase === "toolbar");
    stop();
    check("离开即清理阶段与属性", !attributes("image")["data-goose-block-hover"] && !getBlockToolbarState(editor, "image").ready);

    stop = startBlockHandleHoverPhase(editor, "image", false, false);
    advance(100);
    const previousUi = blockHandleUiKey.getState(view.state);
    const recreated = resolveBlockHandleUiDecorations(view.state);
    check("节点重建可从插件重新取得当前Decoration", recreated.find().length === 1 && attributes("image")["data-goose-block-hover"] === "handle" && blockHandleUiKey.getState(view.state) === previousUi);
    view.state = view.state.apply(view.state.tr.setMeta("unrelated-ui", true));
    check("无关选择或meta事务复用Decoration缓存", resolveBlockHandleUiDecorations(view.state) === recreated);
    advance(100);
    check("重建Decoration不重启200ms等待", attributes("image")["data-goose-block-hover"] === "toolbar");
    stop();
    stop = startBlockHandleHoverPhase(editor, "image", false, false);
    advance(100);
    stop();
    const stopVideo = startBlockHandleHoverPhase(editor, "video", false, false);
    advance(100);
    check("换块取消旧块计时，新块重新等待",
      !getBlockToolbarState(editor, "image").ready && !getBlockToolbarState(editor, "video").ready);
    advance(100);
    check("新块满 200ms 才能显示工具栏", getBlockToolbarState(editor, "video").ready);
    stopVideo();
    check("退出后没有残留计时器", timers.size === 0);

    const stopMenu = startBlockHandleHoverPhase(editor, "image", true, false);
    advance(1000);
    check("块菜单打开时只留把手并压住已选中媒体工具栏",
      attributes("image")["data-goose-block-hover"] === "handle" && getBlockToolbarState(editor, "image").suppressed &&
      !getBlockToolbarState(editor, "image").ready && timers.size === 0);
    stopMenu();
    const stopDrag = startBlockHandleHoverPhase(editor, "image", false, true);
    advance(1000);
    check("块拖动时不弹出工具栏", getBlockToolbarState(editor, "image").suppressed &&
      !getBlockToolbarState(editor, "image").ready && timers.size === 0);
    stopDrag();
    check("结束菜单或拖动会释放压制状态", !getBlockToolbarState(editor, "image").suppressed);
    unsubscribe();
    const count = events.length;
    startBlockHandleHoverPhase(editor, "image", true, false)();
    check("卸载消费者后不会继续接收悬停事件", events.length === count);

    setBlockHandleUi(editor, { emptyBlockId: "image" });
    check("空行高亮由Decoration提供", attributes("image")["data-goose-empty-handle-hover"] === "true");
    setBlockHandleUi(editor, { emptyBlockId: undefined });
    check("UI事务不改变文档且不进入撤销历史", view.state.doc === originalDoc && transactions.every((transaction) => !transaction.docChanged && transaction.getMeta("addToHistory") === false));
    const transactionCount = transactions.length;
    setBlockHandleUi(editor, { emptyBlockId: undefined });
    check("相同UI状态不重复派发事务", transactions.length === transactionCount);
    const source = read("src/components/editor/core/useBlockHandleHoverPhase.ts") + read("src/components/editor/core/EditorSideMenu.tsx");
    check("UI状态源不再直接修改编辑器DOM或观察后重写属性", !source.includes("dataset.gooseBlock") && !source.includes("dataset.gooseEmptyHandleHover") && !source.includes("new MutationObserver"));

    const imageHook = read("src/components/editor/image/useSelectedImage.ts");
    const videoBlock = read("src/components/editor/blocks/video/videoBlock.tsx");
    const table = read("src/components/editor/menus/GooseTableHandlesController.tsx");
    check("图片复用共享阶段并保留原本点击选择",
      imageHook.includes("subscribeBlockHover") && imageHook.includes("pinnedImage.current = true") &&
      imageHook.includes("toolbarState.suppressed ? null : selectedImage"));
    const editorA = {};
    const editorB = {};
    const toolbarA = { dataset: { gooseBlockId: "same-image", gooseEditorOwner: getBlockToolbarOwner(editorA) } };
    const toolbarB = { dataset: { gooseBlockId: "same-image", gooseEditorOwner: getBlockToolbarOwner(editorB) } };
    check("同一编辑器的图片工具栏可固定当前选择",
      ownsBlockToolbar(toolbarA, editorA, "same-image"));
    check("相同笔记分屏的同块工具栏不会互相固定",
      !ownsBlockToolbar(toolbarB, editorA, "same-image") && !ownsBlockToolbar(toolbarA, editorB, "same-image"));
    check("本编辑器的其他图片或无选择时也不会误固定",
      !ownsBlockToolbar(toolbarA, editorA, "other-image") && !ownsBlockToolbar(toolbarA, editorA, null));
    const editControls = read("src/components/editor/image/ImageEditControls.tsx");
    check("图片编辑弹层继承来源块与编辑器归属，输入操作不会关闭工具栏",
      editControls.includes("data-goose-block-id={blockId}") &&
      editControls.includes("data-goose-editor-owner={getBlockToolbarOwner(editor.prosemirrorView.dom)}") &&
      imageHook.includes("ownsBlockToolbar(") && imageHook.includes("selectedImageRef.current?.blockId"));
    check("视频复用共享阶段且菜单压制优先于选中",
      videoBlock.includes("!toolbarState.suppressed && (selected || toolbarState.ready)"));
    const videoToolbarA = { dataset: { gooseBlockId: "same-video", gooseEditorOwner: getBlockToolbarOwner(editorA) } };
    const videoToolbarB = { dataset: { gooseBlockId: "same-video", gooseEditorOwner: getBlockToolbarOwner(editorB) } };
    check("同笔记分屏的视频工具栏只能固定所属编辑器的选择",
      ownsBlockToolbar(videoToolbarA, editorA, "same-video") &&
      !ownsBlockToolbar(videoToolbarB, editorA, "same-video") &&
      videoBlock.includes('ownsBlockToolbar(target?.closest<HTMLElement>("[data-goose-video-toolbar]")') &&
      read("src/components/editor/blocks/video/VideoToolbar.tsx").includes("data-goose-editor-owner={getBlockToolbarOwner(editorRoot)}"));
    check("图片和视频的 portal 均携带来源块 ID",
      read("src/components/editor/image/ImageToolbar.tsx").includes("data-goose-block-id={selectedImage.blockId") &&
      read("src/components/editor/blocks/video/VideoToolbar.tsx").includes("data-goose-block-id={blockId}"));
    check("表格等待阶段，同时保留自身菜单与行列拖动",
      table.includes("!toolbarState.ready && !only && !state.draggingState"));
    const code = read("src/components/editor/blocks/code/CodeBlockToolbar.tsx");
    const codeCss = read("src/pages/workspace/styles/editor-base/code/toolbar.css");
    check("代码语言保持常驻，操作按钮组单独延迟",
      code.indexOf("<CodeLanguagePicker") < code.indexOf('className="goose-code-hover-actions') &&
      codeCss.includes('[data-node-type="blockOuter"][data-goose-block-hover="toolbar"] > [data-node-type="blockContainer"] > .react-renderer > .bn-block-content[data-content-type="codeBlock"] .goose-code-hover-actions') &&
      codeCss.includes(".goose-code-hover-actions:focus-within"));
    const fileCss = read("src/pages/workspace/styles/editor-base/files.css");
    check("文件操作遵循阶段并保留键盘焦点和只读预览",
      fileCss.includes('[data-node-type="blockOuter"][data-goose-block-hover="toolbar"] > [data-node-type="blockContainer"] > .react-renderer > .bn-block-content[data-content-type="file"] .goose-file-block-actions') &&
      fileCss.includes(".goose-file-block-content:focus-within") &&
      fileCss.includes(':not([data-goose-block-toolbar-sequence="true"])'));
  } finally {
    unsubscribe();
    if (previousWindow === undefined) delete globals.window;
    else globals.window = previousWindow;

  }
  return checker.failed;
}
