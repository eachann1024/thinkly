import { useLayoutEffect, type RefObject } from "react";
import type { GroupImperativeHandle, Layout } from "react-resizable-panels";
import { normalizeSizes } from "@/lib/editor-split/tree";
import type { SplitGroup } from "@/lib/editor-split/types";

export function sizesToLayout(group: SplitGroup): Layout {
  const sizes = normalizeSizes(group.sizes, group.children.length);
  const layout: Layout = {};
  for (let i = 0; i < group.children.length; i += 1) {
    layout[group.children[i].id] = sizes[i] ?? 0;
  }
  return layout;
}

export function layoutToSizes(group: SplitGroup, layout: Layout): number[] {
  return normalizeSizes(
    group.children.map((child) => layout[child.id] ?? 0),
    group.children.length,
  );
}

export function equalLayout(group: SplitGroup): Layout {
  const each = 100 / group.children.length;
  const layout: Layout = {};
  for (const child of group.children) layout[child.id] = each;
  return layout;
}

/** 存储里的尺寸变了以后，让已经挂上的分隔组跟上。拖动结束写入的值与当前布局一致时不会再设一次。 */
export function useApplyStoredGroupLayout(
  groupRef: RefObject<GroupImperativeHandle | null>,
  group: SplitGroup,
) {
  useLayoutEffect(() => {
    const api = groupRef.current;
    if (!api) return;
    const next = sizesToLayout(group);
    const current = api.getLayout();
    const same = group.children.every((child) => {
      const left = current[child.id];
      const right = next[child.id];
      return left !== undefined && right !== undefined && Math.abs(left - right) < 0.05;
    });
    if (!same) api.setLayout(next);
  }, [group, groupRef]);
}
