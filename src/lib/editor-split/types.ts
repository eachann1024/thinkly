
export const MAX_SPLIT_LEAVES = 4;

export const EDITOR_SPLIT_COLUMN_ATTR = "data-editor-split-column";

export type SplitGroupOrientation = "horizontal" | "vertical";

export type SplitDirection = "right" | "down";

export type SplitNeighborDirection = "left" | "right" | "up" | "down";

export type SplitDropPlacement = "left" | "right" | "top" | "bottom" | "center";

export type SplitLeaf = {
  kind: "leaf";
  id: string;
  pageId: string;
  title?: string;
};

export type SplitGroup = {
  kind: "group";
  id: string;
  orientation: SplitGroupOrientation;
  children: SplitNode[];
  sizes: number[];
};

export type SplitNode = SplitLeaf | SplitGroup;

export type SplitState = {
  root: SplitNode;
  focusedLeafId: string;
  zoomedLeafId: string | null;
};

export type SplitCreateBlankPage = () => string;

export type SplitLeafSuccess = {
  ok: true;
  state: SplitState;
  newLeafId: string;
};

export type SplitLeafFailure = {
  ok: false;
  error: string;
  state: SplitState;
};

export type SplitLeafResult = SplitLeafSuccess | SplitLeafFailure;

export type CloseLeafResult =
  | { kind: "updated"; state: SplitState }
  | { kind: "last-pane"; state: SplitState };

export type SplitFocusedInput = {
  tabId: string;
  direction: SplitDirection;
  newPageId: string;
};

export type SplitFocusedResult =
  | {
      ok: true;
      newLeafId: string;
      newPageId: string;
    }
  | { ok: false; error: string };

export type CloseFocusedResult =
  | { kind: "updated"; focusedPageId: string | null }
  | { kind: "last-pane" };
