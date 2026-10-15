import type { ReactNode } from "react";

type SidebarRailIconName = "folder" | "outline" | "search" | "settings";

// Vector redraw of the user-selected ChatGPT concept 07 (book pages).
const bookPath =
  "M7 4.1Q7 2.5 8.6 2.85L18.2 5Q19.3 5.25 19.3 6.55V19Q19.3 20.3 18 20L8.2 17.85Q7 17.6 7 16.3Z";
const pagePath =
  "M6.2 2.8H14.3L18.8 7.3V19.3Q18.8 20.8 17.3 20.8H6.2Q4.7 20.8 4.7 19.3V4.3Q4.7 2.8 6.2 2.8Z";
const contentsPath = [9.2, 12.6, 16].map((y) =>
  `M9.1 ${y}a.95 .95 0 1 0 -1.9 0a.95 .95 0 1 0 1.9 0Z ` +
  `M11 ${y - 0.6}h4.8a.6 .6 0 0 1 0 1.2H11a.6 .6 0 0 1 0 -1.2Z`
).join(" ");
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
      <path d="M5.1 5.5H4.7Q3.9 5.5 3.9 6.5V18.7Q3.9 19.6 4.9 19.8L13.3 21.6Q14.2 21.8 14.3 21.1" />
      <path d={bookPath} />
    </>
  ),
  outline: (
    <>
      <path d={pagePath} />
      <path d={contentsPath} fill="currentColor" stroke="none" />
    </>
  ),
  search: (
    <>
      <circle cx="10.3" cy="10.2" r="6.3" />
      <path d="M14.8 14.7L20 20" strokeWidth="2" />
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
      <path d="M5.5 5.4H4.9Q3.3 5.4 3.3 7V19Q3.3 20.5 4.8 20.8L13.4 22.6Q14.7 22.9 15 21.5L7.2 19.8Q5.5 19.45 5.5 17.7Z" />
      <path d={bookPath} />
    </>
  ),
  outline: <path d={`${pagePath} ${contentsPath}`} fillRule="evenodd" />,
  search: (
    <>
      <path
        d="M3.3 10.2a7 7 0 1 0 14 0a7 7 0 1 0 -14 0Z M5.55 10.2a4.75 4.75 0 1 0 9.5 0a4.75 4.75 0 1 0 -9.5 0Z"
        fillRule="evenodd"
      />
      <path d="M13.8 15.6L19.1 20.9A1.3 1.3 0 0 0 20.9 19.1L15.6 13.8Z" />
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
