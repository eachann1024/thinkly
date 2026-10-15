import type { ReactNode } from "react";

type SidebarRailIconName = "folder" | "outline" | "search" | "settings";

// Vector redraw of the user-selected ChatGPT concept 04 (Swiss Minimal).
// Pages: back sheet + front dog-eared document.
const backSheetPath =
  "M5.2 3.2H13.6Q14.8 3.2 14.8 4.4V6H7.4Q5.6 6 5.6 7.8V17.6H5.2Q4 17.6 4 16.4V4.4Q4 3.2 5.2 3.2Z";
const frontPagePath =
  "M8.5 6.2H15.1L19.4 10.5V19.6Q19.4 20.8 18.2 20.8H8.5Q7.3 20.8 7.3 19.6V7.4Q7.3 6.2 8.5 6.2Z";
const frontFoldPath = "M14.6 6.5V11H19.1";
const solidBackSheetPath =
  "M4 4.4Q4 3.2 5.2 3.2H13.6Q14.8 3.2 14.8 4.4V6.2H7.3V16.4Q7.3 17.6 6.1 17.6H5.2Q4 17.6 4 16.4Z";
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
    <>
      <path d={backSheetPath} />
      <path d={frontPagePath} />
      <path d={frontFoldPath} />
    </>
  ),
  outline: (
    <>
      <path d="M4.5 4.5V19.5" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 7.5H19.5" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 12H15.2" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 16.5H19.5" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.6" strokeWidth="1.5" />
      <path d="M15.4 15.4L20.2 20.2" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  settings: (
    <>
      <path d={settingsPath} />
      <circle cx="12" cy="12" r="2.35" />
    </>
  ),
};

const solidIcons: Record<SidebarRailIconName, ReactNode> = {
  folder: (
    <>
      <path d={solidBackSheetPath} />
      <path
        d={`${frontPagePath} M14.6 6.2V11H19.4Z`}
        fillRule="evenodd"
      />
    </>
  ),
  outline: (
    <>
      <rect x="3.1" y="3.6" width="2.8" height="16.8" rx="1.4" />
      <rect x="7.3" y="5.8" width="12.7" height="3.4" rx="1.7" />
      <rect x="7.3" y="10.3" width="8.4" height="3.4" rx="1.7" />
      <rect x="7.3" y="14.8" width="12.7" height="3.4" rx="1.7" />
    </>
  ),
  search: (
    <>
      <path
        d="M3.5 10.5a7 7 0 1 0 14 0a7 7 0 1 0 -14 0Z M5.7 10.5a4.8 4.8 0 1 0 9.6 0a4.8 4.8 0 1 0 -9.6 0Z"
        fillRule="evenodd"
      />
      <path d="M14.2 16L18.8 20.6A1.3 1.3 0 0 0 20.6 18.8L16 14.2Z" />
    </>
  ),
  settings: (
    <path
      d={`${settingsPath} M9.65 12a2.35 2.35 0 1 0 4.7 0a2.35 2.35 0 1 0 -4.7 0Z`}
      fillRule="evenodd"
    />
  ),
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
