import { createReactBlockSpec } from "@blocknote/react";
import { defaultProps, type BlockNoteEditor } from "@blocknote/core";
import { resolvePageIcon } from "@/lib/resolvePageIcon";
import { cn } from "@/components/editor/utils/cn";
import { NotebookIconSelector } from "@/pages/workspace/components/sidebar/NotebookIconSelector";
import { BG_PREVIEW, COLOR_PREVIEW } from "../../toolbars/formatting/colorPalette";
import { sanitizeCssColor } from "@/lib/export/markdown/blockPropsProperties";
import type { CSSProperties } from "react";
import {
  DEFAULT_CALLOUT_ICON,
  LUCIDE_ICON_TO_EMOJI,
  normalizeCalloutIcon,
} from "./calloutIcons";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/callout/calloutBlock.tsx#messages:1">`
zh-Hans:
  calloutIcon: "提示块图标"
en:
  calloutIcon: "Callout icon"
`;
const t = createTranslator(messages);


export { DEFAULT_CALLOUT_ICON, LUCIDE_ICON_TO_EMOJI, normalizeCalloutIcon };

/** 将 Lucide 名（新存）或 emoji（存量）统一渲染为 React 元素 */
function renderCalloutIcon(iconStr: string, className?: string) {
  const resolved = normalizeCalloutIcon(iconStr);
  const IconComp = resolvePageIcon(resolved);
  if (IconComp) {
    return (
      <IconComp className={cn("h-[1em] w-[1em] stroke-[1.75]", className)} />
    );
  }
  return (
    <span className={cn("text-[1em] leading-none", className)}>{resolved}</span>
  );
}

function calloutStyle(props: Record<string, unknown>): CSSProperties {
  const background = sanitizeCssColor(props.backgroundColor);
  const text = sanitizeCssColor(props.textColor);
  return {
    ...(background && background !== "default"
      ? { backgroundColor: BG_PREVIEW[background] ?? background }
      : {}),
    ...(text && text !== "default" ? { color: COLOR_PREVIEW[text] ?? text } : {}),
  };
}

function CalloutBlockView({
  block,
  contentRef,
  editor,
}: {
  block: any;
  contentRef: (node: HTMLElement | null) => void;
  editor: BlockNoteEditor<any, any, any>;
}) {
  useLocale();
  const icon = (block.props.icon as string) || DEFAULT_CALLOUT_ICON;

  return (
    <div
      className="callout-block group flex w-full items-start gap-3 rounded-lg border border-[var(--goose-callout-border)] bg-[var(--goose-callout-bg)] px-3 py-2 text-[length:var(--editor-module-sm-font-size)] leading-[1.5]"
      data-callout="true"
      style={calloutStyle(block.props)}
    >
      <div contentEditable={false} className="callout-icon-slot shrink-0">
        {editor.isEditable ? (
          <NotebookIconSelector value={icon} defaultIcon={DEFAULT_CALLOUT_ICON}
            label={t("calloutIcon")} container={null} compact
            onChange={(value) => {
              if (!editor.isEditable) return;
              editor.updateBlock(block, { props: { icon: value } });
            }} />
        ) : renderCalloutIcon(icon)}
      </div>
      <div
        ref={contentRef}
        className="callout-content min-w-0 flex-1"
      />
    </div>
  );
}

export const calloutBlock = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      ...defaultProps,
      icon: {
        default: DEFAULT_CALLOUT_ICON,
      },
    },
    content: "inline",
  },
  {
    meta: { isolating: false },
    render: (props) => (
      <CalloutBlockView
        block={props.block}
        contentRef={props.contentRef}
        editor={props.editor as BlockNoteEditor<any, any, any>}
      />
    ),
    toExternalHTML: ({ block, contentRef }) => {
      return (
        <div
          className="flex items-start gap-3 rounded-lg border border-[var(--goose-callout-border)] bg-[var(--goose-callout-bg)] px-3 py-2 text-[length:var(--editor-module-sm-font-size)] leading-[1.5]"
          data-callout="true"
          style={calloutStyle(block.props)}
        >
          <span className="callout-icon-slot shrink-0">
            {renderCalloutIcon(
              (block.props.icon as string) || DEFAULT_CALLOUT_ICON,
            )}
          </span>
          <div
            ref={contentRef}
            className="callout-content min-w-0 flex-1"
          />
        </div>
      );
    },
  },
)();
