import { createExtension } from "@blocknote/core";
import {
  createHighlightPlugin,
  type Parser,
} from "@/components/editor/find/highlightPlugin";
import { createParser as createLowlightParser } from "prosemirror-highlight/lowlight";
import { Decoration } from "prosemirror-view";
import { common, createLowlight } from "lowlight";
import { LANGUAGE_ALIASES } from "./codeLanguageAliases";

const lowlight = createLowlight(common);
const lowlightParser = createLowlightParser(lowlight);
const loadedLanguagesSet = new Set(lowlight.listLanguages());

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
  if (options.content.length > 12000) return [];

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
