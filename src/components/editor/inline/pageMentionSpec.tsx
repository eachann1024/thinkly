import { createReactInlineContentSpec } from "@blocknote/react";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import { useEditorPageContext } from "../platform/hostContext";
import { usePageMentionTitle } from "./usePageMentionTitle";
import {
  PAGE_MENTION_TYPE,
  mentionOpenPayload,
  pageMentionLabel,
  pageMentionFromMarkdownLink,
  sanitizePageMentionProps,
  serializePageMentionHref,
  type PageMentionProps,
} from "./pageMention";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/inline/pageMentionSpec.tsx#messages:1">`
zh-Hans:
  untitled: "未命名"
en:
  untitled: "Untitled"
`;
const t = createTranslator(messages);


function PageMentionTag({ props }: { props: PageMentionProps }) {
  const { onOpenPage } = useEditorPageContext();
  const live = usePageMentionTitle(props);
  const label = live.title.trim() ? pageMentionLabel(live) : `@${t("untitled")}`;
  const open = mentionOpenPayload(props);
  return (
    <span
      className="goose-page-mention"
      data-page-id={open.pageId}
      data-wiki-target={open.wikiTarget}
      role="link"
      title={live.notebookName ? `${label} · ${live.notebookName}` : label}
      onMouseDown={(event) => {
        if (event.button !== 0) return;
        if (!open.pageId && !open.wikiTarget) return;
        const newTab = isPlatformPrimaryModifierEvent(event);
        const opened = onOpenPage(
          open.pageId,
          open.wikiTarget,
          newTab ? { newTab: true } : undefined,
        );
        if (opened === false) return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {label}
    </span>
  );
}

export const pageMentionSpec = createReactInlineContentSpec(
  {
    type: PAGE_MENTION_TYPE,
    propSchema: {
      pageId: { default: "" },
      workspaceId: { default: "" },
      title: { default: "未命名" },
      notebookName: { default: "" },
      wikiTarget: { default: "" },
    },
    content: "none",
  },
  {
    parse: (element) => {
      const encoded = element.getAttribute("data-goose-page-mention");
      if (encoded) {
        try {
          const props = sanitizePageMentionProps(JSON.parse(decodeURIComponent(encoded)));
          if (props) return props;
        } catch { /* 无效标记继续按 href 或可见文字导入。 */ }
      }
      const href = element.tagName === "A" ? element.getAttribute("href") : null;
      return href ? pageMentionFromMarkdownLink(element.textContent || "", href) ?? undefined : undefined;
    },
    render: (props) => (
      <PageMentionTag props={props.inlineContent.props as PageMentionProps} />
    ),
    toExternalHTML: (props) => (
      <a
        href={serializePageMentionHref(props.inlineContent.props as PageMentionProps)}
        data-goose-page-mention={encodeURIComponent(JSON.stringify(props.inlineContent.props))}
      >{pageMentionLabel(props.inlineContent.props as PageMentionProps)}</a>
    ),
  },
);
