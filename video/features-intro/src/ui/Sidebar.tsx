import { C } from "../theme";
import { Icon } from "./Icons";
import { Fill } from "./Skeleton";

export type Row = {
  name: string;
  kind?: "file" | "folder";
  depth?: number;
  open?: boolean;
  selected?: boolean;
  /** 0–1：新行展开进入的进度。 */
  enter?: number;
  /** 0–1：强调底色闪现强度。 */
  flash?: number;
  hover?: boolean;
  count?: number;
};

export const FILES: Row[] = [
  { name: "灵感", kind: "folder", open: true, count: 3 },
  { name: "把灵感写成下一步", depth: 1, selected: true },
  { name: "周末的阅读清单", depth: 1 },
  { name: "会议纪要 10·18", depth: 1 },
  { name: "项目", kind: "folder", count: 4 },
  { name: "旅行计划", kind: "folder", count: 2 },
  { name: "写给未来的自己" },
];

export const ROW_H = 30;

export function SidebarHeader({ title = "我的笔记" }: { title?: string }) {
  return (
    <div style={{ height: 36, margin: "8px 8px 6px", padding: "0 8px", display: "flex", alignItems: "center", gap: 8 }}>
      <Icon name="folderOpen" size={16} color={C.text2} />
      <span style={{ fontSize: 14, fontWeight: 560, flex: 1 }}>{title}</span>
      <Icon name="chevronDown" size={14} color={C.text3} />
    </div>
  );
}

export function TreeRow({ row }: { row: Row }) {
  const enter = row.enter ?? 1;
  const flash = row.flash ?? 0;
  const depth = row.depth ?? 0;
  const folder = row.kind === "folder";
  const bg = row.selected
    ? C.selected
    : flash > 0
      ? `rgba(84,125,208,${0.16 * flash})`
      : row.hover
        ? C.hover
        : "transparent";
  return (
    <div style={{ height: ROW_H * enter, overflow: "hidden", opacity: enter }}>
      <div
        style={{
          height: ROW_H,
          margin: "0 8px",
          padding: `0 8px 0 ${6 + depth * 18}px`,
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 14,
          color: row.selected ? C.text : C.text,
          background: bg,
          boxShadow: row.selected ? `inset 0 0 0 1px ${C.accent}` : "none",
        }}
      >
        <div style={{ width: 12, display: "grid", placeItems: "center" }}>
          {folder ? <Icon name={row.open ? "chevronDown" : "chevronRight"} size={12} color={C.text3} /> : null}
        </div>
        <Icon name={folder ? "folder" : "file"} size={16} color={row.selected ? C.text : C.text3} stroke={1.5} />
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden" }}>{row.name}</span>
        {row.count ? <span style={{ fontSize: 12, color: C.text3 }}>{row.count}</span> : null}
      </div>
    </div>
  );
}

export function FileTree({ rows = FILES, title, t = 1 }: { rows?: Row[]; title?: string; t?: number }) {
  const k = (i: number) => Math.min(1, Math.max(0, (t - (i / rows.length) * 0.5) / 0.5));
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <SidebarHeader title={title} />
      {rows.map((row, i) =>
        t >= 1 ? (
          <TreeRow key={row.name} row={row} />
        ) : (
          <Fill key={row.name} t={k(i)} width={`${50 + ((i * 37) % 30)}%`} bar={0.36} style={{ margin: `0 16px 0 ${30 + (row.depth ?? 0) * 18}px` }}>
            <div style={{ margin: `0 -16px 0 ${-30 - (row.depth ?? 0) * 18}px` }}>
              <TreeRow row={row} />
            </div>
          </Fill>
        ),
      )}
    </div>
  );
}

export function withSelected(name: string, rows = FILES): Row[] {
  return rows.map((r) => ({ ...r, selected: r.name === name }));
}
