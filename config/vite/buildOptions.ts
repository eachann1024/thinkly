import type { BuildOptions } from "vite";
import { debugMinify, debugSourcemap } from "../../vite.debug";
import { createBuildInput } from "./targets";
import { codeSplittingGroups } from "./chunkGroups";
export function createBuildOptions(root: string): BuildOptions {
  return {
    outDir: "dist-electron/renderer",
    sourcemap: debugSourcemap,
    modulePreload: { polyfill: false },
    minify: debugMinify,
    rolldownOptions: {
      input: createBuildInput(root),
      output: {
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
