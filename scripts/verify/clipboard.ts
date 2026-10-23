import { BlockNoteEditor } from "@blocknote/core";
import { TextSelection } from "@tiptap/pm/state";
import { history } from "@tiptap/pm/history";
import { createChecker } from "./lib/check";
import { insertContainedBlocks } from "@/components/editor/utils/containedPaste";
import { pasteClipboardFilesFromClipboard, pasteClipboardMedia, pasteNativeClipboardImage } from "@/components/editor/utils/pasteClipboardFilesFromClipboard";
import { clipboardHasPasteableImage, clipboardHasPasteableMedia, extractClipboardFiles, shouldDeferPasteToMediaHandler, shouldReadNativeClipboardImage } from "@/components/editor/utils/pasteClipboardImage";
import { NodeSelection } from "@tiptap/pm/state";
import { pasteBlocksAtCursor } from "@/components/editor/utils/pasteAtCursor";
import { clipboardHtmlDroppedMedia, withoutCopiedBlockIds } from "@/components/editor/hooks/editorPasteBlocks";
import { writeSelectionClipboard } from "@/components/editor/extensions/copyBlockClipboard";
import { resolveClipboardPasteRoute } from "@/components/editor/utils/pasteClipboardImage";

// 真实 BlockNote 事务与项目 schema；无 DOM，不模拟系统剪贴板、解码或宿主文件系统。
Object.defineProperty(navigator, "languages", { configurable: true, value: ["zh-CN"] });
const { editorSchema } = await import("@/components/editor/core/schema");
const { jsonContentToMarkdown } = await import("@/lib/export/markdown/serialize");
const { markdownToJsonContent } = await import("@/lib/export/markdown/parse/block");
const { encodeLocalBlockPropsWrappers } = await import("@/lib/export/markdown/localBlockPropsWrappers");

const png = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "capture", { type: "image/png" });
const video = new File(["video bytes"], "clip.mp4", { type: "video/mp4" });
const transfer = (files: File[], items: unknown[] = []) => ({ files, items }) as unknown as DataTransfer;
const item = (file: File, type = file.type) => ({ kind: "file", type, getAsFile: () => file });
const texts = (value: any[]): string => value.map(part => part.text ?? "").join("");
const inlineText = (value: any): string => typeof value === "string" ? value :
  Array.isArray(value) ? value.map(inlineText).join("") : value?.text ?? inlineText(value?.content ?? "");
function shape(block: any): unknown {
  return {
    type: block.type,
    content: block.type === "table"
      ? block.content.rows.map((row: any) => row.cells.map(inlineText))
      : inlineText(block.content),
    children: (block.children ?? []).map(shape),
    ...(block.type === "heading" ? { level: block.props?.level ?? 1 } : {}),
    ...(block.type === "numberedListItem" ? { start: block.props?.start ?? 1 } : {}),
    ...(block.type === "checkListItem" ? { checked: block.props?.checked ?? false } : {}),
    ...(block.props?.url ? { url: block.props.url } : {}),
  };
}

function create(initialContent: any[]) {
  const uploaded: { file: File; blockId?: string }[] = [];
  const editor = BlockNoteEditor.create({
    schema: editorSchema,
    initialContent,
    uploadFile: async (file, blockId) => {
      uploaded.push({ file, blockId });
      return `./assets/${file.name}.saved`;
    },
  });
  editor.prosemirrorView.updateState(editor.prosemirrorState.reconfigure({ plugins: [history()] }));
  return { editor, uploaded };
}

export default async function run() {
  const checker = createChecker();
  const check = checker.check;
  const verify = async (name: string, action: () => unknown) => {
    try { check(name, await action()); }
    catch (error) { check(name, false, error instanceof Error ? error.message : String(error)); }
  };
  await verify("图片识别覆盖 items、仅 files、空 MIME 及 items/files 重复表示", () => {
    const emptyMime = new File([png], "capture.png");
    return clipboardHasPasteableImage(transfer([], [item(png)])) &&
      clipboardHasPasteableImage(transfer([png])) &&
      clipboardHasPasteableImage(transfer([emptyMime])) &&
      extractClipboardFiles(transfer([png], [item(png)])).length === 1 &&
      clipboardHasPasteableMedia(transfer([video])) &&
      !clipboardHasPasteableImage(transfer([video]));
  });
  for (const source of [transfer([], [item(png)]), transfer([png])]) {
    await verify(`图片${source.items.length ? " items" : " files"}粘贴：真实事务内插入、上传、回填且单步撤回`, async () => {
      const { editor, uploaded } = create([{ type: "paragraph" }]);
      const before = editor.document;
      let prevented = false;
      await pasteClipboardFilesFromClipboard({ clipboardData: source, preventDefault: () => { prevented = true; } } as unknown as ClipboardEvent, editor);
      const image = editor.document[0];
      const valid = prevented && image.type === "image" && Boolean(image.props.url) &&
        uploaded.length === 1 && uploaded[0].blockId === image.id &&
        editor.document[1]?.type === "paragraph";
      return valid && editor.undo() && JSON.stringify(editor.document) === JSON.stringify(before);
    });
  }
  await verify("视频复用媒体粘贴链路并完成上传回填", async () => {
    const { editor, uploaded } = create([{ type: "paragraph", content: "保留原文" }]);
    await pasteClipboardMedia(editor, [{ file: video, mime: video.type }]);
    return texts(editor.document[0].content as any[]) === "保留原文" &&
      editor.document[1]?.type === "video" && Boolean(editor.document[1].props.url) && uploaded.length === 1;
  });
  await verify("采用剪贴板 MIME，空 file.type 的 SVG 不误标成 PNG", async () => {
    const { editor, uploaded } = create([{ type: "paragraph" }]);
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], "capture");
    await pasteClipboardMedia(editor, [{ file: svg, mime: "image/svg+xml" }]);
    return uploaded[0]?.file.type === "image/svg+xml" && Boolean(editor.document[0].props.url);
  });
  for (const type of ["paragraph", "quote", "callout"]) {
    await verify(`${type} 内图片粘贴：不嵌套读取状态，保留前后文与已有子块`, async () => {
      const { editor } = create([{ type, content: "前后", props: type === "paragraph" ? { backgroundColor: "blue" } : {}, children: [{ type: "paragraph", content: "原子块" }] }]);
      editor.setTextCursorPosition(editor.document[0], "start");
      const start = editor.prosemirrorState.selection.from;
      editor.transact(tr => tr.setSelection(TextSelection.create(tr.doc, start + 1)));
      await pasteClipboardMedia(editor, [{ file: png, mime: png.type }]);
      const parent = editor.document[0];
      return parent.type === type && texts(parent.content as any[]) === "前" &&
        parent.children[0]?.type === "image" && Boolean(parent.children[0].props.url) &&
        texts(parent.children[1]?.content as any[]) === "后" &&
        texts(parent.children[2]?.content as any[]) === "原子块";
    });
  }
  const samples: any[] = [
    { type: "heading", props: { level: 2 }, content: "标题" },
    { type: "bulletListItem", content: "无序", children: [{ type: "numberedListItem", content: "子项" }] },
    { type: "numberedListItem", props: { start: 3 }, content: "有序" },
    { type: "checkListItem", props: { checked: true }, content: "待办" },
    { type: "toggleListItem", content: "折叠", children: [{ type: "paragraph", content: "展开" }] },
    { type: "quote", content: "引用" },
    { type: "callout", content: "标注" },
    { type: "codeBlock", props: { language: "javascript" }, content: "const value = 1;" },
    { type: "table", content: { type: "tableContent", rows: [{ cells: ["A", "B"] }] } },
    { type: "image", props: { url: "./assets/pic.png", name: "pic.png" } },
    { type: "audio", props: { url: "./assets/sound.mp3", name: "sound.mp3" } },
    { type: "video", props: { url: "./assets/movie.mp4", name: "movie.mp4" } },
    { type: "file", props: { url: "./assets/manual.pdf", name: "manual.pdf" } },
    { type: "divider" },
    { type: "columnLayout", children: [
      { type: "columnSection", children: [{ type: "paragraph", content: "左" }] },
      { type: "columnSection", children: [{ type: "paragraph", content: "右" }] },
    ] },
  ];
  for (const sample of samples) {
    await verify(`${sample.type} 块：空段替换、容器内事务插入、序列化保留结构`, () => {
      const { editor } = create([{ type: "paragraph" }]);
      pasteBlocksAtCursor(editor as any, withoutCopiedBlockIds([{ id: "source", ...sample }]), editor.document[0]);
      const pasted = editor.document[0];
      if (editor.document.length !== 1 || pasted.type !== sample.type || pasted.id === "source") return false;
      const markdown = jsonContentToMarkdown(encodeLocalBlockPropsWrappers(editor.document as any, { preserveEmptyParagraphs: true }));
      // 这三类写为 HTML，读回依赖真实 DOMParser；Node 只验真实序列化
      // 输出及 BlockNote JSON 重建，不用伪造 DOM 解析器冒充宿主验收。
      const htmlType = ["table", "audio", "video"].includes(sample.type);
      const restored = htmlType
        ? create(JSON.parse(JSON.stringify(editor.document))).editor.document
        : markdownToJsonContent(markdown);
      if (htmlType && !markdown.includes(`<${sample.type}`)) return false;
      if (JSON.stringify(restored.map(shape)) !== JSON.stringify(editor.document.map(shape))) return false;
      if (sample.props?.url && (restored[0].props.url !== sample.props.url || !markdown.includes(sample.props.url))) return false;
      const { editor: container } = create([{ type: "quote", content: "容器" }]);
      let ids: string[] | null = null;
      container.transact(() => { ids = insertContainedBlocks(container, [sample]); });
      return Boolean(ids?.length) &&
        JSON.stringify(shape(container.document[0].children[0])) === JSON.stringify(shape(pasted));
    });
  }
  await verify("图片文件只读一次，内部块 HTML 优先于同剪贴板位图", async () => {
    const { editor } = create([{ type: "paragraph" }]);
    let reads = 0;
    const once = {
      items: [{ kind: "file", type: "image/png", getAsFile: () => (++reads === 1 ? png : null) }],
      files: [],
      types: ["image/png"],
      getData: () => "",
    };
    const route = resolveClipboardPasteRoute(once as any, true);
    let prevented = false;
    await pasteClipboardFilesFromClipboard({
      clipboardData: once,
      preventDefault() { prevented = true; },
    } as any, editor);
    const html = `<div data-node-type="blockContainer"><div data-content-type="image" data-url="./assets/pic.png"></div></div>`;
    const both = {
      items: [{ kind: "file", type: "image/png", getAsFile: () => png }],
      files: [],
      types: ["text/html", "image/png"],
      getData: (type: string) => type === "text/html" ? html : "",
    };
    const plain = { types: ["text/plain"], items: [], files: [], getData: () => "hello" };
    return route === "media-files" && prevented && reads === 1 && editor.document[0].type === "image" &&
      resolveClipboardPasteRoute(both as any, true) === "blocks" &&
      resolveClipboardPasteRoute(plain as any, true) === "default";
  });
  await verify("单张图片块复制写入内部 HTML，解析丢媒体时能识别", () => {
    const { editor } = create([{ type: "image", props: { url: "./assets/pic.png", name: "pic.png" } }]);
    let pos = -1;
    editor.prosemirrorState.doc.descendants((node, nodePos) => {
      if (pos >= 0) return false;
      if (node.type.name === "blockContainer") { pos = nodePos; return false; }
      return true;
    });
    editor.transact((tr) => { tr.setSelection(NodeSelection.create(tr.doc, pos)); });
    const html = `<div data-content-type="image" data-url="./assets/pic.png"></div>`;
    const store = new Map<string, string>();
    const wrote = writeSelectionClipboard({
      state: editor.prosemirrorState,
      serializeForClipboard: () => ({ dom: { innerHTML: html, querySelectorAll: () => [] } }),
    } as any, {
      defaultPrevented: false,
      clipboardData: {
        clearData: () => store.clear(),
        setData: (type: string, value: string) => store.set(type, value),
      },
      preventDefault() { this.defaultPrevented = true; },
    } as any);
    const dropped = clipboardHtmlDroppedMedia(html, [{ type: "paragraph" }]);
    const kept = clipboardHtmlDroppedMedia(html, [{ type: "image", props: { url: "./assets/pic.png" } }]);
    const blocks = Array.from({ length: 1_000_000 }, () => ({ type: "paragraph" }));
    const started = performance.now();
    const missed = clipboardHtmlDroppedMedia(html, blocks);
    const elapsed = performance.now() - started;
    return wrote && store.get("blocknote/html") === html && store.get("text/html") === html &&
      dropped && !kept && missed && elapsed < 50;
  });
  await verify("Shottr 的 PNG 在粘贴事件里没有文件时仍插入图片块", async () => {
    const { editor, uploaded } = create([{ type: "paragraph" }]);
    let reads = 0;
    const shottr = {
      types: ["image/png"],
      items: [{ kind: "file", type: "image/png", getAsFile: () => { reads += 1; return null; } }],
      files: [],
      getData: () => "",
    };
    const should = shouldReadNativeClipboardImage(shottr as any);
    const bytes = new Uint8Array(await png.arrayBuffer());
    const dataUrl = `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
    await pasteNativeClipboardImage(editor, async () => dataUrl);
    const defer = { types: ["image/png"], items: [{ kind: "file", type: "image/png", getAsFile: () => png }] };
    const textOnly = { types: ["text/plain"], items: [], files: [], getData: () => "批发平台" };
    let firstNull = 0;
    const retry = { items: [{ kind: "file", type: "image/png", getAsFile: () => (firstNull++ === 0 ? null : png) }], files: [] };
    const missed = extractClipboardFiles(retry as any);
    const found = extractClipboardFiles(retry as any);
    return should && shouldDeferPasteToMediaHandler(defer as any, true) && defer.items[0] &&
      !shouldReadNativeClipboardImage(textOnly as any) &&
      missed.length === 0 && found.length === 1 &&
      editor.document[0].type === "image" && Boolean(editor.document[0].props.url) &&
      uploaded.length === 1 && reads === 1;
  });
  return checker.failed;
}
