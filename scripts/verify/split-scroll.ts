/**
 * 分屏同步滚动：比例换算、只联动同笔记、关闭与程序滚动不回传、可用性。
 * 运行：node scripts/verify/run.mjs split-scroll
 */
import {
  createSyncScrollBus,
  scrollRatio,
  scrollTopForRatio,
  shouldRelayScroll,
  syncScrollAvailable,
  toggleSyncScrollFlag,
  type ScrollMetrics,
  type SyncScrollBus,
  type SyncScrollPane,
} from "@/lib/editor-split/syncScroll";
import type { SplitState } from "@/lib/editor-split/types";
import { createChecker } from "./lib/check";

function box(scrollTop: number, scrollHeight: number, clientHeight: number): ScrollMetrics {
  return { scrollTop, scrollHeight, clientHeight };
}

function stateOf(pageIds: string[]): SplitState {
  if (pageIds.length <= 1) {
    return {
      root: { kind: "leaf", id: "only", pageId: pageIds[0] ?? "missing" },
      focusedLeafId: "only",
      zoomedLeafId: null,
    };
  }
  return {
    root: {
      kind: "group",
      id: "g",
      orientation: "horizontal",
      sizes: pageIds.map(() => 100 / pageIds.length),
      children: pageIds.map((pageId, index) => ({ kind: "leaf", id: `p${index}`, pageId })),
    },
    focusedLeafId: "p0",
    zoomedLeafId: null,
  };
}

function harness(pageIds: string[], heights: number[], echo = true): {
  panes: SyncScrollPane[];
  bus: SyncScrollBus;
  enabled: { on: boolean };
  flush: () => void;
  schedules: { count: number };
} {
  const panes: SyncScrollPane[] = pageIds.map((pageId, index) => ({
    id: `p${index}`,
    pageId,
    box: box(0, heights[index] ?? 100, 100),
  }));
  const enabled = { on: true };
  const queue: Array<() => void> = [];
  const schedules = { count: 0 };
  let bus: SyncScrollBus;
  bus = createSyncScrollBus({
    enabled: () => enabled.on,
    panes: () => panes,
    apply: (id, scrollTop) => {
      const pane = panes.find((item) => item.id === id);
      if (!pane) return;
      pane.box.scrollTop = scrollTop;
      if (echo) bus.onScroll(id);
    },
    schedule: (flush) => {
      schedules.count += 1;
      queue.push(flush);
    },
  });
  return {
    panes,
    bus,
    enabled,
    schedules,
    flush: () => {
      const job = queue.shift();
      job?.();
    },
  };
}

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;

  console.log("· 比例换算");
  const source = box(40, 200, 100);
  const target = box(0, 500, 100);
  check("可滚动比例", scrollRatio(source) === 0.4);
  check("按比例落到目标", scrollTopForRatio(target, scrollRatio(source)) === 160);
  const stuck = box(12, 80, 80);
  const oversize = box(0, 40, 90);
  check("不可滚动比例为 0", scrollRatio(stuck) === 0 && scrollRatio(oversize) === 0);
  check("不可滚动目标落点为 0", scrollTopForRatio(stuck, 0.4) === 0 && scrollTopForRatio(oversize, 1) === 0);
  check("越界比例夹紧", scrollTopForRatio(target, 2) === 400 && scrollTopForRatio(target, -1) === 0);
  check("非数字比例当 0", scrollRatio(box(Number.NaN, 200, 100)) === 0 && scrollTopForRatio(target, Number.NaN) === 0);

  console.log("· 只同步同笔记");
  const same = harness(["note-a", "note-a", "note-b"], [200, 500, 300]);
  same.panes[0].box.scrollTop = 40;
  same.bus.onUserScroll("p0");
  same.bus.onUserScroll("p0");
  check("同一帧只排一次", same.schedules.count === 1);
  same.flush();
  check("同笔记按比例跟上", same.panes[1].box.scrollTop === 160);
  check("不同笔记不动", same.panes[2].box.scrollTop === 0);
  check("源格不被回写", same.panes[0].box.scrollTop === 40);

  console.log("· 关闭时不同步");
  const off = harness(["note-a", "note-a"], [200, 500]);
  off.enabled.on = false;
  off.panes[0].box.scrollTop = 40;
  off.bus.onUserScroll("p0");
  off.flush();
  check("关闭时不排程", off.schedules.count === 0 && off.panes[1].box.scrollTop === 0);
  const flipped = harness(["note-a", "note-a"], [200, 500]);
  flipped.panes[0].box.scrollTop = 40;
  flipped.bus.onUserScroll("p0");
  flipped.enabled.on = false;
  flipped.flush();
  check("刷帧前关掉则不写", flipped.panes[1].box.scrollTop === 0);
  let flags: Record<string, true> = {};
  flags = toggleSyncScrollFlag(flags, "tab");
  check("开关默认关、切换后开", flags.tab === true);
  flags = toggleSyncScrollFlag(flags, "tab");
  check("再切回到关", flags.tab === undefined);

  console.log("· 程序滚动不回传");
  check("回声不转发", shouldRelayScroll({ echoing: true, enabled: true, userDriven: true }) === false);
  check("未开不转发", shouldRelayScroll({ echoing: false, enabled: false, userDriven: true }) === false);
  check("没有用户手势不转发", shouldRelayScroll({ echoing: false, enabled: true, userDriven: false }) === false);
  check("用户滚动才转发", shouldRelayScroll({ echoing: false, enabled: true, userDriven: true }) === true);
  const echo = harness(["note-a", "note-a", "note-b"], [200, 500, 300]);
  echo.panes[0].box.scrollTop = 50;
  echo.bus.onUserScroll("p0");
  echo.flush();
  check("同步写入时的回声不改源格", echo.panes[0].box.scrollTop === 50 && echo.panes[1].box.scrollTop === 200 && echo.panes[2].box.scrollTop === 0 && echo.schedules.count === 1);
  const deferred = harness(["note-a", "note-a"], [200, 500], false);
  deferred.panes[0].box.scrollTop = 50;
  deferred.bus.onUserScroll("p0");
  deferred.flush();
  deferred.bus.onScroll("p1");
  deferred.flush();
  check("迟到的程序回声不再排程", deferred.schedules.count === 1 && deferred.panes[0].box.scrollTop === 50 && deferred.panes[1].box.scrollTop === 200);
  const dead = harness(["note-a", "note-a"], [200, 80]);
  dead.panes[0].box.scrollTop = 40;
  dead.panes[1].box.clientHeight = 100;
  dead.bus.onUserScroll("p0");
  dead.flush();
  check("不可滚动的格保持 0 且不回写源格", dead.panes[1].box.scrollTop === 0 && dead.panes[0].box.scrollTop === 40);

  console.log("· 可用性");
  check("没有分屏树不可用", syncScrollAvailable(null) === false && syncScrollAvailable(undefined) === false);
  check("只有一格不可用", syncScrollAvailable(stateOf(["note-a"])) === false);
  check("笔记都不同不可用", syncScrollAvailable(stateOf(["note-a", "note-b", "note-c"])) === false);
  check("两格同一笔记可用", syncScrollAvailable(stateOf(["note-a", "note-a"])) === true);
  check("四格里后两格相同也可用", syncScrollAvailable(stateOf(["a", "b", "c", "c"])) === true);

  return checker.failed;
}
