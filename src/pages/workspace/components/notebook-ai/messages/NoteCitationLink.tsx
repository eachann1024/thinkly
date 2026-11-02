import type { ComponentProps } from "react";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import { navigateNotebookAiReference } from "@/lib/notebook-ai/navigateReference";
import { parseNoteCitationHref, type NoteCitation } from "@/lib/notebook-ai/noteCitation";

type LinkProps = ComponentProps<"a"> & { node?: unknown };

export function NoteCitationLink({ href, children, node: _node, onOpenCitation, ...props }: LinkProps & {
  onOpenCitation: (citation: NoteCitation) => void;
}) {
  const citation = parseNoteCitationHref(href);
  return <a target="_blank" rel="noreferrer" {...props} href={href} onClick={citation ? event => {
    event.preventDefault();
    onOpenCitation(citation);
  } : props.onClick}>{children}</a>;
}

export function AssistantNoteCitationLink(props: LinkProps) {
  const { onOpenPage } = useEditorPageContext();
  return <NoteCitationLink {...props} onOpenCitation={({ pageId, location }) => {
    navigateNotebookAiReference(pageId, onOpenPage, location);
  }} />;
}
