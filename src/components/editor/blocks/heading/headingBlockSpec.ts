import type { BlockNoteEditor } from "@blocknote/core";
import {
  createExtension,
  createBlockConfig,
  createBlockSpec,
  defaultProps,
} from "@blocknote/core";
import {
  addDefaultPropsExternalHTML,
  parseDefaultProps,
} from "@blocknote/core/blocks";
const HEADING_LEVELS = [1, 2, 3] as const;

export function headingLevelForHashPrefix(text: string): number | null {
  const match = /^(#+)$/u.exec(text);
  if (!match || !HEADING_LEVELS.includes(match[1].length as (typeof HEADING_LEVELS)[number])) return null;
  return match[1].length;
}

const createHeadingKeyboardShortcut =
  (level: number) =>
  ({ editor }: { editor: BlockNoteEditor<any, any, any> }) => {
    const cursorPosition = editor.getTextCursorPosition();
    if (
      editor.schema.blockSchema[cursorPosition.block.type].content !== "inline"
    ) {
      return false;
    }
    editor.updateBlock(cursorPosition.block, {
      type: "heading",
      props: { level },
    });
    return true;
  };

export const gooseHeadingBlockConfig = createBlockConfig(() => ({
  type: "heading" as const,
  propSchema: {
    ...defaultProps,
    level: { default: 1 as const, values: HEADING_LEVELS },
  },
  content: "inline" as const,
}));

export const createGooseHeadingBlockSpec = createBlockSpec(
  gooseHeadingBlockConfig,
  () => ({
    meta: {
      isolating: false,
    },
    parse(e: HTMLElement) {
      let level: number | undefined;
      switch (e.tagName) {
        case "H1":
          level = 1;
          break;
        case "H2":
          level = 2;
          break;
        case "H3":
          level = 3;
          break;
        default:
          return undefined;
      }
      const props: Record<string, unknown> = {
        ...parseDefaultProps(e),
        level,
      };
      return props;
    },
    render(block) {
      const dom = document.createElement(`h${block.props.level}`);
      return { dom, contentDOM: dom };
    },
    toExternalHTML(block) {
      const dom = document.createElement(`h${block.props.level}`);
      addDefaultPropsExternalHTML(block.props, dom);
      return { dom, contentDOM: dom };
    },
  }),
  () => [
    createExtension({
      key: "goose-heading-shortcuts",
      keyboardShortcuts: Object.fromEntries(
        HEADING_LEVELS.map((level) => [
          `Mod-Alt-${level}`,
          createHeadingKeyboardShortcut(level),
        ]),
      ),
      inputRules: HEADING_LEVELS.map((level) => ({
        find: new RegExp(`^(#{${level}})\\s$`),
        replace({ match }: { match: RegExpMatchArray }) {
          return {
            type: "heading",
            props: { level: match[1].length },
          };
        },
      })),
    }),
  ],
);

export const gooseHeadingBlockSpec = createGooseHeadingBlockSpec();
