import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { AnswerBody } from "./search-sheet/AnswerBody";
import { SearchBody } from "./search-sheet/SearchBody";
import { Filters, QueryRow, SheetFooter, SheetShell } from "./search-sheet/SheetChrome";

export function SearchSheetMock({
  mode = "search",
  resultCount = 5,
  style,
}: {
  mode?: "search" | "answer";
  resultCount?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  return (
    <SheetShell style={style}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 34,
          flex: "none",
        }}
      >
        <span style={{ width: 56, height: 6, borderRadius: 3, background: COLORS.border }} />
      </div>
      {mode === "search" ? (
        <>
          <QueryRow />
          <Filters />
          <div style={{ flex: 1, minHeight: 0, paddingTop: 4, overflow: "hidden" }}>
            <SearchBody frame={frame} resultCount={resultCount} />
          </div>
          <SheetFooter />
        </>
      ) : (
        <>
          <QueryRow />
          <Filters />
          <div style={{ flex: 1, minHeight: 0, paddingTop: 16, display: "flex", flexDirection: "column" }}>
            <AnswerBody frame={frame} />
          </div>
        </>
      )}
    </SheetShell>
  );
}
