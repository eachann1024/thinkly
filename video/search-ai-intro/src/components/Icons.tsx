import type { CSSProperties } from "react";
import { COLORS } from "../theme";

const base = (size: number, style?: CSSProperties): CSSProperties => ({
  width: size,
  height: size,
  flex: "none",
  ...style,
});

export function SearchIcon({ size = 24, color = COLORS.muted }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={base(size, { color })} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SparkleIcon({ size = 24, color = COLORS.accent }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={base(size, { color })} aria-hidden="true">
      <path
        d="M12 3.5c.6 4.2 2.3 6 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.5 5.9-2.3 6.5-6.5Z"
        fill="currentColor"
      />
      <path d="M18.5 15.5c.3 1.9 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1.1 3-3Z" fill="currentColor" opacity=".55" />
    </svg>
  );
}

export function FileIcon({ size = 24, color = COLORS.muted }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={base(size, { color })} aria-hidden="true">
      <path d="M6 3.5h8l4 4v13H6v-17Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3.5v4h4M9 12h6M9 15.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function FolderIcon({ size = 22, color = COLORS.muted }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={base(size, { color })} aria-hidden="true">
      <path d="M3.5 6.5h6l2 2h9v10h-17v-12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function TypeIcon({ size = 20, color = COLORS.muted }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={base(size, { color })} aria-hidden="true">
      <path d="M5 6.5V4.5h14v2M12 4.5v15M9 19.5h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronIcon({ size = 16, color = COLORS.muted }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={base(size, { color })} aria-hidden="true">
      <path d="m7 9.5 5 5 5-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MessageIcon({ size = 20, color = COLORS.accent }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={base(size, { color })} aria-hidden="true">
      <path d="M4 5.5h16v11H9l-5 4v-15Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 9h8M8 12.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 20, color = COLORS.muted }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={base(size, { color })} aria-hidden="true">
      <path d="M19 12H5m6-6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon({ size = 22, color = COLORS.accent }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={base(size, { color })} aria-hidden="true">
      <path d="m4.5 12.5 5 5 10-11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SendIcon({ size = 22, color = COLORS.white }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={base(size, { color })} aria-hidden="true">
      <path d="M4 12 20 4l-6 16-3.5-6.5L4 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
