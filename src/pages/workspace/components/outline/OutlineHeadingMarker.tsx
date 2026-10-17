import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/outline/OutlineHeadingMarker.tsx#localMessages:1">`
zh-Hans:
  collapseSubheadings: "收起子标题"
  expandSubheadings: "展开子标题"
en:
  collapseSubheadings: "Collapse subheadings"
  expandSubheadings: "Expand subheadings"
`;
const uiText = createTranslator(localMessages);
import { MainTreeRowDisclosure } from "../sidebar/main-tree/MainTreeRowShell";

interface OutlineHeadingMarkerProps {
  level: number;
  expandable: boolean;
  expanded: boolean;
  onToggle: () => void;
}

export function OutlineHeadingMarker({
  level,
  expandable,
  expanded,
  onToggle,
}: OutlineHeadingMarkerProps) {
  useLocale();
  return (
    <span
      className="outline-heading-marker"
      data-expandable={expandable ? "true" : undefined}
    >
      <span className="outline-heading-level" aria-hidden="true">
        H{level}
      </span>
      {expandable && (
        <MainTreeRowDisclosure
          expanded={expanded}
          label={expanded ? uiText("collapseSubheadings") : uiText("expandSubheadings")}
          onToggle={onToggle}
          className="outline-heading-disclosure"
        />
      )}
    </span>
  );
}
