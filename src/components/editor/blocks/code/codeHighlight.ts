import { createExtension } from "@blocknote/core";
import {
  createHighlightPlugin,
  type Parser,
} from "@/components/editor/find/highlightPlugin";
import { createParser as createLowlightParser } from "prosemirror-highlight/lowlight";
import { Decoration } from "prosemirror-view";
import { common, createLowlight } from "lowlight";
import { LANGUAGE_ALIASES } from "./codeLanguageAliases";

// 所有宿主均以 highlight.js common（~37 种常用语言）作为代码高亮基线，
// 把语法包从 ~1MB（all 全量）降到 ~300KB（vendor-markdown 1257KB→530KB）。
// 注意：不做小众语言运行时按需加载——vite/rolldown 对 node_modules 既无法 code-split
// 裸包模板字符串，import.meta.glob 又会把全部 192 种语言 eager 内联进首屏（体积反弹到
// 1.4MB，是负优化）。故 common 外语言一律同步降级为无高亮纯文本（不报错），由 failedSet 记录。
const lowlight = createLowlight(common);
const lowlightParser = createLowlightParser(lowlight);
const loadedLanguagesSet = new Set(lowlight.listLanguages());

// 不支持的语言直接显示纯文本，避免误触发所有已加载语言的自动识别。
const failedLangsSet = new Set<string>();

const PLAIN_TEXT_LANGUAGES = new Set(["none", "plain", "plaintext", "text", "txt"]);

export function normalizeHighlightLanguage(language: string | undefined) {
  const normalized = (language || "text").trim().toLowerCase();
  return LANGUAGE_ALIASES[normalized] ?? normalized;
}

function createRegexDecorations(
  content: string,
  pos: number,
  patterns: Array<{ regex: RegExp; className: string }>,
) {
  const decorations: Decoration[] = [];

  patterns.forEach(({ regex, className }) => {
    for (const match of content.matchAll(regex)) {
      if (match.index === undefined || !match[0]) continue;
      decorations.push(
        Decoration.inline(
          pos + 1 + match.index,
          pos + 1 + match.index + match[0].length,
          {
            class: className,
          },
        ),
      );
    }
  });

  return decorations;
}

function createRegexCaptureDecorations(
  content: string,
  pos: number,
  patterns: Array<{ regex: RegExp; captureGroup: number; className: string }>,
) {
  const decorations: Decoration[] = [];

  patterns.forEach(({ regex, captureGroup, className }) => {
    for (const match of content.matchAll(regex)) {
      const text = match[captureGroup];
      if (match.index === undefined || !text) continue;
      const offset = match[0].indexOf(text);
      if (offset < 0) continue;
      decorations.push(
        Decoration.inline(
          pos + 1 + match.index + offset,
          pos + 1 + match.index + offset + text.length,
          { class: className },
        ),
      );
    }
  });

  return decorations;
}

const mermaidParser: Parser = ({ content, pos }) =>
  createRegexDecorations(content, pos, [
    {
      regex:
        /\b(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|journey|gantt|pie|gitGraph|mindmap|subgraph|end|participant|actor|as|loop|alt|else|opt|par|and|rect|note|over|title|section)\b/g,
      className: "hljs-keyword",
    },
    {
      regex: /(-->|---|--x|--o|==>|-.->|-\.-|:::|\|[^|\n]+\|)/g,
      className: "hljs-operator",
    },
    {
      regex: /(\[[^\]\n]+\]|\{[^}\n]+\}|\([^)\n]+\))/g,
      className: "hljs-string",
    },
  ]);

const SHELL_HIGHLIGHT_LANGUAGES = new Set(["bash", "shell", "sh", "zsh"]);

const shellCommandParser: Parser = ({ content, pos }) =>
  createRegexCaptureDecorations(content, pos, [
    {
      regex: /(^|[;&|]\s*)([A-Za-z_][\w.-]*)(?=\s|$)/gm,
      captureGroup: 2,
      className: "hljs-title",
    },
    {
      regex: /(^|\s)(-{1,2}[\w-]+)(?=\s|=|$)/gm,
      captureGroup: 2,
      className: "hljs-params",
    },
    {
      regex: /(^|\s)([A-Za-z_][\w]*=)(?=\S)/gm,
      captureGroup: 2,
      className: "hljs-variable",
    },
  ]);

const codeBlockHighlightParser: Parser = (options) => {
  const language = normalizeHighlightLanguage(options.language);

  if (PLAIN_TEXT_LANGUAGES.has(language)) return [];
  if (language === "mermaid") return mermaidParser(options);

  if (failedLangsSet.has(language)) return [];

  if (!loadedLanguagesSet.has(language)) {
    failedLangsSet.add(language);
    return [];
  }

  try {
    const decorations = lowlightParser({
      ...options,
      language,
    }) as any;

    if (SHELL_HIGHLIGHT_LANGUAGES.has(language)) {
      const shellDecorations = shellCommandParser(options);
      if (Array.isArray(shellDecorations) && shellDecorations.length > 0) {
        const baseDecorations = Array.isArray(decorations) ? decorations : [];
        return [...baseDecorations, ...shellDecorations];
      }
    }

    return decorations;
  } catch {
    return [];
  }
};

export const codeBlockHighlightExtension = createExtension({
  key: "goose-code-block-highlighter",
  prosemirrorPlugins: [
    createHighlightPlugin({
      parser: codeBlockHighlightParser,
      nodeTypes: ["codeBlock"],
      languageExtractor: (node) => {
        const lang = node.attrs.language || node.attrs.props?.language;
        return normalizeHighlightLanguage(lang);
      },
    }),
  ],
});
