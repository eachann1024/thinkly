import type { ComponentProps } from "react";
export { MdInput } from "../markdown-input";

export function MdTable({
  children,
  node,
  className,
  style,
  ...props
}: ComponentProps<"table"> & { node?: unknown }) {
  void node;
  void className;
  return (
    <div
      className="ai-md-table-scroll"
      data-streamdown="table-wrapper"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <table
        className="ai-md-table"
        data-streamdown="table"
        style={{
          width: "auto",
          minWidth: "100%",
          maxWidth: "none",
          tableLayout: "auto",
          borderCollapse: "collapse",
          ...style,
        }}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function MdThead({
  children,
  node,
  className,
  ...props
}: ComponentProps<"thead"> & { node?: unknown }) {
  void node;
  void className;
  return (
    <thead data-streamdown="table-header" {...props}>
      {children}
    </thead>
  );
}

export function MdTh({
  children,
  node,
  className,
  style,
  ...props
}: ComponentProps<"th"> & { node?: unknown }) {
  void node;
  void className;
  return (
    <th
      data-streamdown="table-header-cell"
      style={{ whiteSpace: "normal", wordBreak: "break-word", ...style }}
      {...props}
    >
      {children}
    </th>
  );
}

export function MdTr({
  children,
  node,
  className,
  ...props
}: ComponentProps<"tr"> & { node?: unknown }) {
  void node;
  void className;
  return (
    <tr data-streamdown="table-row" {...props}>
      {children}
    </tr>
  );
}

export function MdTd({
  children,
  node,
  className,
  style,
  ...props
}: ComponentProps<"td"> & { node?: unknown }) {
  void node;
  void className;
  return (
    <td
      data-streamdown="table-cell"
      style={{ whiteSpace: "normal", wordBreak: "break-word", ...style }}
      {...props}
    >
      {children}
    </td>
  );
}
