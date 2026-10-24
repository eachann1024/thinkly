import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/math.ts#localMessages:1">`
zh-Hans:
  couldnTEncodeTheEquationImage: "公式图片编码失败"
  equation: "公式"
en:
  couldnTEncodeTheEquationImage: "Couldn’t encode the equation image"
  equation: "Equation"
ja:
  couldnTEncodeTheEquationImage: "数式画像をエンコードできませんでした"
  equation: "数式"
`;
const uiText = createTranslator(localMessages);
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import type { CardTheme } from "./themes";

function getCodeBlockText(block: any): string {
  const content = block?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (!item || typeof item !== "object") return "";
        if (item.type === "hardBreak") return "\n";
        return typeof item.text === "string" ? item.text : "";
      })
      .join("");
  }
  return content == null ? "" : String(content);
}

async function mathHtmlToPngDataUrl(html: string, theme: CardTheme): Promise<string> {
  const { captureElementAsPngBlob } = await import("./svgToPng");

  const wrapper = document.createElement("div");
  wrapper.style.cssText = [
    "position:fixed",
    "left:-99999px",
    "top:0",
    "z-index:-1",
    "padding:16px 24px",
    `color:${theme.textColor}`,
    "background:transparent",
    "font-size:18px",
    "line-height:1.4",
    "display:inline-block",
  ].join(";");
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  try {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const blob = await captureElementAsPngBlob(wrapper);
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error(uiText("couldnTEncodeTheEquationImage")));
      reader.readAsDataURL(blob);
    });
  } finally {
    document.body.removeChild(wrapper);
  }
}

async function renderMathBlockAsImage(block: any, theme: CardTheme): Promise<void> {
  if (block?.type !== "codeBlock" || block.props?.language !== "math") return;

  const source = getCodeBlockText(block).trim();
  if (!source) return;

  try {
    const { default: katex } = await import("katex");
    if (typeof document !== "undefined" && !document.getElementById("goose-katex-css")) {
      try {
        const link = document.createElement("link");
        link.id = "goose-katex-css";
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
        document.head.appendChild(link);
        await new Promise<void>((resolve) => {
          link.onload = () => resolve();
          link.onerror = () => resolve();
          setTimeout(() => resolve(), 1500);
        });
      } catch {
      }
    }

    const html = katex.renderToString(source, {
      displayMode: true,
      throwOnError: false,
      output: "html",
    });

    const dataUrl = await mathHtmlToPngDataUrl(html, theme);
    block.type = "image";
    block.content = undefined;
    block.children = [];
    block.props = {
      url: dataUrl,
      caption: uiText("equation"),
      textAlignment: "center",
    };
  } catch (error) {
    console.error("[imageExport] math render failed:", error);
  }
}

async function walkBlocks(blocks: any[], theme: CardTheme): Promise<void> {
  for (const block of blocks) {
    await renderMathBlockAsImage(block, theme);
    if (Array.isArray(block?.children) && block.children.length > 0) {
      await walkBlocks(block.children, theme);
    }
  }
}

export async function renderMathBlocksAsImages(
  blocks: BlockNoteContent,
  theme: CardTheme,
): Promise<void> {
  if (!Array.isArray(blocks) || blocks.length === 0) return;
  await walkBlocks(blocks as any[], theme);
}
