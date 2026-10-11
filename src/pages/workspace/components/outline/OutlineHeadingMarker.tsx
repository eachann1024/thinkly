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
          label={expanded ? "收起子标题" : "展开子标题"}
          onToggle={onToggle}
          className="outline-heading-disclosure"
        />
      )}
    </span>
  );
}
