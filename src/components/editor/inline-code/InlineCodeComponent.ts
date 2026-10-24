import {
  createStyleSpecFromTipTapMark,
  defaultStyleSpecs,
} from "@blocknote/core";

const inlineCodeMark = defaultStyleSpecs.code.implementation.mark.extend({
  inclusive: false,
  renderHTML({ HTMLAttributes }) {
    return [
      "code",
      { ...HTMLAttributes, "data-goose-inline-code": "" },
      [
        "span",
        {
          "aria-hidden": "true",
          contenteditable: "false",
          "data-goose-inline-code-boundary": "start",
        },
      ],
      ["span", { "data-goose-inline-code-content": "" }, 0],
      [
        "span",
        {
          "aria-hidden": "true",
          contenteditable: "false",
          "data-goose-inline-code-boundary": "end",
        },
      ],
    ];
  },
});

const internalStyleSpec = createStyleSpecFromTipTapMark(
  inlineCodeMark,
  "boolean",
);

export const gooseInlineCodeStyleSpec: typeof internalStyleSpec = {
  ...internalStyleSpec,
  implementation: {
    ...internalStyleSpec.implementation,
    toExternalHTML() {
      const code = document.createElement("code");
      return { dom: code, contentDOM: code };
    },
  },
};

export const gooseEditorStyleSpecs = {
  ...defaultStyleSpecs,
  code: gooseInlineCodeStyleSpec,
};
