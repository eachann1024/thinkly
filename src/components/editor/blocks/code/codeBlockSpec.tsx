import { createReactBlockSpec } from "@blocknote/react";
import { defaultProps } from "@blocknote/core";
import { CodeBlockComponent } from "./CodeBlockComponent";
import { LANGUAGE_ALIASES } from "./codeLanguageAliases";
import { codeBlockHighlightExtension } from "./codeHighlight";
import { codeBlockTabIndentExtension } from "./codeIndentExtension";
import { gooseCodeBlockActiveLineExtension } from "./codeBlockActiveLine";

export const codeBlockSpec = createReactBlockSpec(
  {
    type: "codeBlock",
    propSchema: {
      ...defaultProps,
      language: { default: "text" },
      wrap: { default: false },
      collapsed: { default: false },
      summary: { default: "" },
    },
    content: "inline",
  },
  {
    meta: { code: true, isolating: false },
    render: ({ block, contentRef, editor }) => (
      <CodeBlockComponent
        block={block}
        contentRef={contentRef}
        editor={editor}
      />
    ),
    parse: (element: HTMLElement) => {
      const tag = element.tagName?.toUpperCase();
      if (tag !== "PRE") return undefined;
      const codeEl = element.querySelector("code");
      const langSource = codeEl ?? element;
      let language =
        langSource.getAttribute("data-language") ||
        langSource.getAttribute("data-lang") ||
        "";
      if (!language) {
        const cls = langSource.getAttribute("class") || "";
        const m = cls.match(/(?:language|lang)-([\w+#-]+)/i);
        if (m) language = m[1];
      }
      const normalized = language
        ? (LANGUAGE_ALIASES[language.trim().toLowerCase()] ??
          language.trim().toLowerCase())
        : "text";
      return { language: normalized };
    },
    toExternalHTML: ({ block, contentRef }) => {
      const lang = (block.props?.language || "text").trim();
      return (
        <pre>
          <code
            ref={contentRef}
            className={lang ? `language-${lang}` : undefined}
          />
        </pre>
      );
    },
  },
  [
    codeBlockHighlightExtension,
    codeBlockTabIndentExtension,
    gooseCodeBlockActiveLineExtension,
  ],
)();
