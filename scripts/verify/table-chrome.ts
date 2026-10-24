import {
  SIDE_MENU_CONTENT_GAP,
  isPointerInSideMenuCorridor,
  isPointerInTableChromeReach,
  tableSideMenuWidth,
} from "@/components/editor/core/sideMenuHover";
import { createChecker } from "./lib/check";
import { readFileSync } from "node:fs";

export default function run() {
  const checker = createChecker();
  const table = { left: 200, right: 800, top: 300, bottom: 520 };

  checker.check(
    "行把手外侧 4px 缝仍算这张表",
    isPointerInTableChromeReach(table, table.left - 4, table.top + 22, 1),
  );
  checker.check(
    "列把手上方 4px 缝仍算这张表",
    isPointerInTableChromeReach(table, table.left + 40, table.top - 4, 1),
  );
  checker.check(
    "左上角块把手仍算这张表",
    isPointerInTableChromeReach(table, table.left - 40, table.top - 20, 1),
  );
  checker.check(
    "标题中线以上且不在左上角时，不再占住这张表",
    !isPointerInTableChromeReach(table, table.left + 120, table.top - 50, 1),
  );

  const corridorTop = table.top - 38;
  const corridor = {
    left: table.left,
    top: corridorTop,
    height: table.bottom - corridorTop,
  };
  checker.check(
    "块把手 pill 落在加宽后的侧栏走廊里",
    isPointerInSideMenuCorridor(
      table.left - 40,
      table.top - 20,
      corridor,
      SIDE_MENU_CONTENT_GAP + tableSideMenuWidth(1),
      32,
    ),
  );
  checker.check(
    "只留 6px 间距时，pill 不在走廊里",
    !isPointerInSideMenuCorridor(
      table.left - 40,
      table.top - 20,
      corridor,
      SIDE_MENU_CONTENT_GAP,
      32,
    ),
  );

  const controller = readFileSync("src/components/editor/menus/GooseTableHandlesController.tsx", "utf8");
  checker.check(
    "表格共用 200ms 门控后直接可见，不再等待透明度动画帧",
    controller.includes("!toolbarState.ready && !only && !state.draggingState") &&
      controller.includes("useTransitionStylesProps={{ duration: 0, initial: { opacity: 1 }, open: { opacity: 1 } }}"),
  );
  checker.check(
    "定位前保持隐藏，末尾定位中间件才释放当前表格",
    controller.includes('visibility: positionedElement === element ? "visible" : "hidden"') &&
      controller.indexOf('name: "gooseTablePositioned"') > controller.indexOf("...(stretch") &&
      controller.includes("setPositionedElement(referenceElement)") &&
      controller.includes("elements.reference : elements.reference.contextElement"),
  );
  checker.check(
    "旧表格迟到的定位结果不能覆盖当前表格状态",
    controller.includes("const latestElementRef = useRef(element)") &&
      controller.includes("latestElementRef.current = element") &&
      /if \(referenceElement === latestElementRef\.current\)\s*\{\s*setPositionedElement\(referenceElement\);\s*\}/.test(controller),
  );

  return checker.failed;
}
