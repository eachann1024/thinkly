// 可调试构建开关：设置环境变量 GOOSE_DEBUG=1。
//
// 正式构建（默认）：不写 sourcemap。调试构建才把 .map 留在产物里。
// 调试构建（GOOSE_DEBUG=1）：sourcemap = true + 不压缩 → 产物 JS 含 sourceMappingURL，
//   removeMapFiles() 跳过保留 .map，Electron 开发者工具(Chromium DevTools) Sources 面板直读 src/。
//
// 关联：vite.config.ts 读取这些导出；scripts/electron-build.js 用同一 env 判断是否保留 .map。

export const isDebugBuild = process.env.GOOSE_DEBUG === "1";

// 调试：完整 sourcemap（含 sourcesContent，devtools 可还原 src/）；正式：不生成
export const debugSourcemap: boolean = isDebugBuild;

// 调试：关闭压缩，devtools 还原后可读；正式：默认压缩（esbuild）
export const debugMinify: boolean = !isDebugBuild;
