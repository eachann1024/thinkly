import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { codeInspectorPlugin } from "code-inspector-plugin";
import { isDebugBuild } from "./vite.debug";
import { createResolveOptions } from "./config/vite/resolution";
import { createAppLogger } from "./config/vite/logger";
import { createAssetPlugin } from "./config/vite/assetPlugin";
import { createIconMiddleware } from "./config/vite/iconMiddleware";
import { createAutoImportPlugins } from "./config/vite/autoImportPlugin";
import { createBuildOptions } from "./config/vite/buildOptions";
import { createI18nPlugin } from "./config/vite/i18nPlugin";
import { optimizeDeps } from "./config/vite/optimizeDeps";

export default defineConfig(({ command }) => ({
  customLogger: createAppLogger(),
  base: "./",
  define: {
    __GOOSE_EDITOR_COMPACT__: false,
    __GOOSE_EDITOR_AI__: true,
  },
  plugins: [
    createI18nPlugin(),
    createAssetPlugin(__dirname),
    ...(command === "serve"
      ? [codeInspectorPlugin({
        bundler: "vite" as const,
        hideConsole: true,
        hideDomPathAttr: true,
      })]
      : []),
    react(),
    ...createAutoImportPlugins(),
    createIconMiddleware(),
  ],
  resolve: createResolveOptions(__dirname),
  optimizeDeps,
  server: { host: "0.0.0.0", port: 6001, sourcemapIgnoreList: false },
  build: createBuildOptions(__dirname),
  logLevel: isDebugBuild ? "info" : "error",
}));
