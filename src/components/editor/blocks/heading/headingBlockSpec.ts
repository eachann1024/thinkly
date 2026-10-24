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
import {
  createPersistentToggleWrapper,
  createToggleExternalHTML,
  parseToggleDetailsContent,
} from "../toggle/toggleBlockHelpers";

const HEADING_LEVELS = [1, 2, 3] as const;

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
      props: { level, isToggleable: false },
    });
    return true;
  };

export const gooseHeadingBlockConfig = createBlockConfig(() => ({
  type: "heading" as const,
  propSchema: {
    ...defaultProps,
    level: { default: 1 as const, values: HEADING_LEVELS },
    collapsed: { default: false },
    isToggleable: { default: false },
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
      if (e.tagName === "DETAILS") {
        const heading = e.querySelector(":scope > summary > h1, :scope > summary > h2, :scope > summary > h3");
        if (!heading) return undefined;
        return {
          ...parseDefaultProps(heading as HTMLElement),
          level: Number(heading.tagName[1]),
          isToggleable: true,
          collapsed: !e.hasAttribute("open"),
        };
      }
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
      if (e.getAttribute("data-collapsed") === "true") {
        props.collapsed = true;
      }
      return props;
    },
    parseContent: ({ el, schema }) => el.tagName === "DETAILS"
      ? parseToggleDetailsContent(el, schema, "heading")
      : undefined,
    runsBefore: ["toggleListItem"],
    render(block, editor) {
      const dom = document.createElement(`h${block.props.level}`);
      if (block.props.isToggleable) {
        return { ...createPersistentToggleWrapper(block, editor, dom), contentDOM: dom };
      }
      if (block.props.collapsed === true) {
        dom.setAttribute("data-collapsed", "true");
      }
      return { dom, contentDOM: dom };
    },
    toExternalHTML(block) {
      const dom = document.createElement(`h${block.props.level}`);
      addDefaultPropsExternalHTML(block.props, dom);
      if (block.props.isToggleable) {
        return createToggleExternalHTML(dom, block.props.collapsed);
      }
      if (block.props.collapsed) {
        dom.setAttribute("data-collapsed", "true");
      }
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
