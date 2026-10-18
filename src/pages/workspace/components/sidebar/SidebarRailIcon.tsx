import type { ReactNode } from "react";

export type SidebarRailIconName = "folder" | "ai" | "outline" | "search" | "calendar" | "settings" | "feedback";

// Geometry follows concept 04's 246px preview crops, normalized to 24px.
// The back sheet is open so no hidden edges show through the front page.
const backSheetPath =
  "M14.1 3.9Q14.1 2.1 12.3 2.1H4.5Q2.8 2.1 2.8 3.9V16.4Q2.8 18.2 4.5 18.2H6.2";
const frontPagePath =
  "M9.8 5.85H16.65Q17.5 5.85 18.1 6.45L20.65 9Q21.2 9.55 21.2 10.4V20.1Q21.2 21.85 19.45 21.85H9.8Q8.05 21.85 8.05 20.1V7.6Q8.05 5.85 9.8 5.85Z";
const frontFoldPath = "M16.85 6V9.1Q16.85 10.35 18.1 10.35H21.05";
const solidBackSheetPath =
  "M2.45 3.6Q2.45 1.55 4.5 1.55H12.3Q14.4 1.55 14.4 3.6V4.2H10.1Q6.85 4.2 6.85 7.45V18.5H4.5Q2.45 18.5 2.45 16.5Z";
const solidFrontPagePath =
  "M9.8 5.55H16.4V9.15Q16.4 11 18.2 11H21.5V20.45Q21.5 22.4 19.5 22.4H9.8Q8.05 22.4 8.05 20.55V7.3Q8.05 5.55 9.8 5.55Z";
const outlineSpinePath = "M2.25 3.95V19.95";
const outlineLinesPath = "M6.85 7H21.5M6.85 12.05H15.2M6.85 17.05H21.5";
const searchHandlePath = "M15.4 15.3L20.9 21";
const aiSparklePath =
  "M10.2 4.3Q11 11.3 17.9 13.1Q11 14.9 10.2 21.9Q9.4 14.9 2.5 13.1Q9.4 11.3 10.2 4.3Z M18.2 2.1Q18.6 5 21.5 5.4Q18.6 5.8 18.2 8.7Q17.8 5.8 14.9 5.4Q17.8 5 18.2 2.1Z";
const feedbackPath =
  "M5 6.2H19Q20.8 6.2 20.8 8V15.2Q20.8 17 19 17H10.2L6.2 20.2V17H5Q3.2 17 3.2 15.2V8Q3.2 6.2 5 6.2Z";
const settingsPath = [
  "M8.81 5.71 Q9.23 5.46 9.48 4.83 L9.88 3.83 Q10.13 3.2 11.18 3.2",
  "L12.82 3.2 Q13.87 3.2 14.12 3.83 L14.52 4.83 Q14.77 5.46 15.19 5.71",
  "L15.85 6.09 Q16.27 6.33 16.95 6.23 L18.01 6.08 Q18.69 5.98 19.21 6.89",
  "L20.04 8.31 Q20.56 9.22 20.14 9.76 L19.47 10.6 Q19.05 11.13 19.05 11.62",
  "L19.05 12.38 Q19.05 12.87 19.47 13.4 L20.14 14.24 Q20.56 14.78 20.04 15.69",
  "L19.21 17.11 Q18.69 18.02 18.01 17.92 L16.95 17.77 Q16.27 17.67 15.85 17.91",
  "L15.19 18.29 Q14.77 18.54 14.52 19.17 L14.12 20.17 Q13.87 20.8 12.82 20.8",
  "L11.18 20.8 Q10.13 20.8 9.88 20.17 L9.48 19.17 Q9.23 18.54 8.81 18.29",
  "L8.15 17.91 Q7.73 17.67 7.05 17.77 L5.99 17.92 Q5.31 18.02 4.79 17.11",
  "L3.96 15.69 Q3.44 14.78 3.86 14.24 L4.53 13.4 Q4.95 12.87 4.95 12.38",
  "L4.95 11.62 Q4.95 11.13 4.53 10.6 L3.86 9.76 Q3.44 9.22 3.96 8.31",
  "L4.79 6.89 Q5.31 5.98 5.99 6.08 L7.05 6.23 Q7.73 6.33 8.15 6.09 Z",
].join(" ");

const outlineIcons: Record<SidebarRailIconName, ReactNode> = {
  folder: (
    <g strokeWidth="1.2">
      <path d={backSheetPath} strokeLinecap="butt" />
      <path d={frontPagePath} />
      <path d={frontFoldPath} />
    </g>
  ),
  ai: <path d={aiSparklePath} strokeWidth="1.2" />,
  outline: (
    <>
      <path d={outlineSpinePath} strokeWidth="1.4" />
      <path d={outlineLinesPath} strokeWidth="1.45" />
    </>
  ),
  search: (
    <g strokeWidth="1.2">
      <circle cx="10.3" cy="10.1" r="7.2" />
      <path d={searchHandlePath} />
    </g>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="17" rx="2" />
      <path d="M7 2.5V6.5M17 2.5V6.5M3 9H21" />
      <path d="M7 13H8M11.5 13H12.5M16 13H17M7 17H8M11.5 17H12.5M16 17H17" />
    </>
  ),
  settings: (
    <>
      <path d={settingsPath} />
      <circle cx="12" cy="12" r="2.35" />
    </>
  ),
  feedback: <path d={feedbackPath} />,
};

const solidIcons: Record<SidebarRailIconName, ReactNode> = {
  folder: (
    <>
      <path d={solidBackSheetPath} />
      <path d={solidFrontPagePath} />
      <path d="M17.65 5.65L21.3 9.65H17.65Z" />
    </>
  ),
  ai: <path d={aiSparklePath} />,
  outline: (
    <g fill="none" stroke="currentColor" strokeWidth="2.1">
      <path d={outlineSpinePath} />
      <path d={outlineLinesPath} />
    </g>
  ),
  search: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="10.3" cy="10.1" r="6.7" />
      <path d={searchHandlePath} />
    </g>
  ),
  calendar: (
    <>
      <path
        d="M5 3.8H19Q21.7 3.8 21.7 6.5V19.5Q21.7 22.2 19 22.2H5Q2.3 22.2 2.3 19.5V6.5Q2.3 3.8 5 3.8Z M3.8 8.3H20.2V9.7H3.8Z M6.5 12.2H8.5V14.2H6.5Z M11 12.2H13V14.2H11Z M15.5 12.2H17.5V14.2H15.5Z M6.5 16.2H8.5V18.2H6.5Z M11 16.2H13V18.2H11Z M15.5 16.2H17.5V18.2H15.5Z"
        fillRule="evenodd"
      />
      <path d="M7 2.5V6.5M17 2.5V6.5" fill="none" stroke="currentColor" strokeWidth="2.1" />
    </>
  ),
  settings: (
    <path
      d={`${settingsPath} M9.65 12a2.35 2.35 0 1 0 4.7 0a2.35 2.35 0 1 0 -4.7 0Z`}
      fillRule="evenodd"
    />
  ),
  feedback: <path d={feedbackPath} />,
};

export function SidebarRailIcon({
  name,
  selected,
}: {
  name: SidebarRailIconName;
  selected: boolean;
}) {
  return (
    <svg
      className="sidebar-rail-icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill={selected ? "currentColor" : "none"}
      stroke={selected ? "none" : "currentColor"}
      strokeWidth={1.45}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {selected ? solidIcons[name] : outlineIcons[name]}
    </svg>
  );
}
