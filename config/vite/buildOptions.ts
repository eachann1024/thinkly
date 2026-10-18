import type { BuildOptions } from "vite";
import { debugMinify, debugSourcemap } from "../../vite.debug";
import { createBuildInput } from "./targets";
import { codeSplittingGroups } from "./chunkGroups";
export function createBuildOptions(root: string): BuildOptions {
  return {
    outDir: "dist-electron/renderer",
    // 正式不写 sourcemap；GOOSE_DEBUG=1 时 true（DevTools 还原 src/）
    sourcemap: debugSourcemap,
    // 只给入口的静态依赖注入 modulepreload。rolldown 默认把入口「可能动态 import 的
    // 全部 chunk」也写进 index.html（曾达 65 条 / 6.2MB：pdf、docx、katex、搜索面板…），
    // 冷启动时这些字节会和首屏脚本抢带宽和解析线程。动态 import 仍由 __vitePreload 预热。
    modulePreload: { polyfill: false },
    minify: debugMinify,
    rolldownOptions: {
      input: createBuildInput(root),
      output: {
        // rolldown 原生分包；不用废弃的 manualChunks
        codeSplitting: {
          groups: codeSplittingGroups,
        },
        sourcemapIgnoreList: false,
        chunkFileNames: "chunks/[name].js",
        entryFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
      onwarn(warning, warn) {
        if (warning.code === "INEFFECTIVE_DYNAMIC_IMPORT") return;
        // KaTeX CSS 里字体用相对路径引用自身，Vite 打包后基准目录变动导致此警告，运行时正常
        if (
          warning.code === "UNRESOLVED_IMPORT" &&
          warning.message?.includes("fonts/KaTeX_")
        )
          return;
        if (
          warning.message?.includes("didn't resolve at build time") &&
          warning.message?.includes("KaTeX_")
        )
          return;
        warn(warning);
      },
    },
    chunkSizeWarningLimit: 3000,
    reportCompressedSize: false,
  };
}
