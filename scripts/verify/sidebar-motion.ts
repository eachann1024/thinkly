import { readFileSync } from "node:fs";
import path from "node:path";
import { shouldAnimateSidebarWidth } from "@/pages/workspace/components/sidebar/sidebarWidthMotion";
import { createChecker } from "./lib/check";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

export default function run() {
  const checker = createChecker();
  checker.check("首次落位不动画", shouldAnimateSidebarWidth(null, 256) === false);
  checker.check("拖宽或窗口钳制不动画", shouldAnimateSidebarWidth(256, 200) === false && shouldAnimateSidebarWidth(200, 256) === false);
  checker.check("收起和展开要动画", shouldAnimateSidebarWidth(256, 0) === true && shouldAnimateSidebarWidth(0, 256) === true);
  checker.check("已经收起不再动画", shouldAnimateSidebarWidth(0, 0) === false);

  const sidebar = read("src/pages/workspace/components/sidebar/Sidebar.tsx");
  const layout = read("src/pages/workspace/components/sidebar/sidebar-shell/useSidebarLayout.tsx");
  const motion = read("src/pages/workspace/components/sidebar/sidebarWidthMotion.ts");
  const floating = read("src/pages/workspace/components/sidebar/sidebar-shell/useSidebarFloating.ts");
  const hover = read("src/pages/workspace/components/sidebar/sidebar-hover.css");
  const titlebar = read("src/pages/workspace/styles/workspace/native-titlebar.css");
  const shell = read("src/pages/workspace/styles/workspace/shell.css");

  checker.check(
    "侧栏占位跟动画变量走，收起不再把宽度写成 0",
    sidebar.includes('width: "var(--workspace-sidebar-width)"') && !sidebar.includes("width: sidebarCollapsed ? 0"),
  );
  checker.check(
    "自动收起走同一套展开收起判断",
    layout.includes("shouldAnimateSidebarWidth") && layout.includes("setWorkspaceSidebarWidth"),
  );
  checker.check("用 motion 补间，并尊重减少动态效果", motion.includes('from "motion/react"') && motion.includes("prefers-reduced-motion"));
  checker.check("窄窗临时面板仍浮着淡出，并排收起不因此脱离文档流", floating.includes("sidebarOverlay || fading") && !floating.includes("sidebarCollapsed"));
  checker.check(
    "顶栏内边距跟着同一变量，收起不再瞬间改成固定值",
    hover.includes("var(--workspace-rail-width) + var(--workspace-sidebar-width)") &&
      !titlebar.includes('.electron-titlebar[data-sidebar-collapsed="true"]'),
  );
  checker.check("时长与现有侧栏曲线一致", shell.includes("--workspace-sidebar-motion: 200ms") && motion.includes("SIDEBAR_WIDTH_MOTION_MS = 200"));
  checker.check("拖宽时仍关掉侧栏过渡", hover.includes("[data-sidebar-resizing]") || read("src/pages/workspace/components/navigation-motion.css").includes("[data-sidebar-resizing]"));
  return checker.failed;
}
