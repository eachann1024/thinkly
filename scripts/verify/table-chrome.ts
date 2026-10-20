/**
 * 表格左上角的块把手和行/列把手画在边框外。
 * 指针在缝里或块把手上时仍算这张表；标题中线以上、离开左上角后则不算。
 * 运行：node scripts/verify/run.mjs table-chrome
 */
import {
  SIDE_MENU_CONTENT_GAP,
  isPointerInSideMenuCorridor,
  isPointerInTableChromeReach,
  tableSideMenuWidth,
} from "@/components/editor/core/sideMenuHover";
import { createChecker } from "./lib/check";

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

  return checker.failed;
}
