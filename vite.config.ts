import { defineConfig, loadEnv } from "vite";
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { codeInspectorPlugin } from "code-inspector-plugin";
import { isDebugBuild } from "./vite.debug";
import { createResolveOptions } from "./config/vite/resolution";
import { createAppLogger } from "./config/vite/logger";
import { createAssetPlugin } from "./config/vite/assetPlugin";
import { createIconMiddleware } from "./config/vite/iconMiddleware";
import { createAutoImportPlugins } from "./config/vite/autoImportPlugin";
import { createBuildOptions } from "./config/vite/buildOptions";
import { optimizeDeps } from "./config/vite/optimizeDeps";

export default defineConfig(({ command, mode }) => ({
  customLogger: createAppLogger(),
  base: "./",
  define: {
    __GOOSE_EDITOR_COMPACT__: false,
    __GOOSE_EDITOR_AI__: true,
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(
      command === "serve"
        ? JSON.parse(
            readFileSync(new URL("./package.json", import.meta.url), "utf8"),
          ).version
        : loadEnv(mode, __dirname, "").VITE_APP_VERSION,
    ),
  },
  plugins: [
    createAssetPlugin(__dirname),
    codeInspectorPlugin({
      bundler: "vite",
      hideConsole: true,
      hideDomPathAttr: true,
    }),
    react(),
    ...createAutoImportPlugins(),
    createIconMiddleware(),
  ],
  resolve: createResolveOptions(__dirname),
  optimizeDeps,
  server: { host: "0.0.0.0", port: 6001, sourcemapIgnoreList: false },
  build: createBuildOptions(__dirname),
  logLevel: isDebugBuild ? "info" : "warn",
}));
