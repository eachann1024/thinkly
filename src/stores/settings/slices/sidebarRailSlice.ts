export type SidebarRailItem = "pages" | "ai" | "outline" | "search";

export const DEFAULT_SIDEBAR_RAIL_ORDER: readonly SidebarRailItem[] = [
  "pages",
  "ai",
  "outline",
  "search",
];

const KNOWN_ITEMS = new Set<string>(DEFAULT_SIDEBAR_RAIL_ORDER);

/** 去掉未知与重复项；缺失项按默认位置补回，旧数据和新增入口都能得到完整顺序。 */
export function normalizeSidebarRailOrder(value: unknown): SidebarRailItem[] {
  const order: SidebarRailItem[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item !== "string" || !KNOWN_ITEMS.has(item)) continue;
      if (!order.includes(item as SidebarRailItem)) order.push(item as SidebarRailItem);
    }
  }
  DEFAULT_SIDEBAR_RAIL_ORDER.forEach((item, index) => {
    if (!order.includes(item)) order.splice(Math.min(index, order.length), 0, item);
  });
  return order;
}

export interface SidebarRailSliceState {
  sidebarRailOrder: SidebarRailItem[];
}

export interface SidebarRailSliceActions {
  setSidebarRailOrder: (order: SidebarRailItem[]) => void;
}

export type SidebarRailSlice = SidebarRailSliceState & SidebarRailSliceActions;

type SetFn = (
  updater: Partial<SidebarRailSlice> | ((state: SidebarRailSlice) => Partial<SidebarRailSlice>),
) => void;

export function createSidebarRailSlice(set: SetFn): SidebarRailSlice {
  return {
    sidebarRailOrder: [...DEFAULT_SIDEBAR_RAIL_ORDER],
    setSidebarRailOrder: (order) => set({ sidebarRailOrder: normalizeSidebarRailOrder(order) }),
  };
}
