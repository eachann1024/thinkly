import path from "node:path";
import type { Plugin, PluginOption } from "vite";
import AutoImport from "unplugin-auto-import/vite";
import { autoImportEntries } from "./autoImportEntries";
import { autoImportPackages } from "./autoImportPackages";
import { createAutoImportDeclarationGenerator } from "./autoImportDeclarations";
import { createGenerationQueue } from "../../scripts/i18n/catalogQueue.mjs";

export function createDeclarationPlugin(): Plugin {
  let root = process.cwd();
  let watching = false;
  let generator: ReturnType<typeof createAutoImportDeclarationGenerator> | undefined;
  let queue: ReturnType<typeof createGenerationQueue<void>> | undefined;
  const generate = (paths: string[] | null = null) => {
    generator ??= createAutoImportDeclarationGenerator(root);
    queue ??= createGenerationQueue(async (dirty) => { await generator!.generate(dirty); });
    return queue.request(paths);
  };
  return {
    name: "goose-auto-import-declarations",
    configResolved(config) {
      root = config.root;
      watching = config.command === "build" && Boolean(config.build.watch);
    },
    buildStart: () => generate(),
    buildEnd: () => generate(),
    async closeBundle() { if (!watching) await queue?.close(); },
    async closeWatcher() { await queue?.close(); },
    configureServer(server) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const dirty = new Set<string>();
      let full = false;
      const onSourceChange = (file: string, topology = false) => {
        const relative = path.relative(root, file).replaceAll("\\", "/");
        if (
          !/\.[cm]?[jt]sx?$/.test(relative) ||
          relative === "src/auto-imports.d.ts" || relative.startsWith("src/auto-imports/")
        )
          return;
        clearTimeout(timer);
        if (topology) full = true;
        else dirty.add(file);
        timer = setTimeout(() => {
          const paths = full ? null : [...dirty];
          full = false; dirty.clear();
          void generate(paths).catch((error) =>
            server.config.logger.error(String(error)),
          );
        }, 100);
      };
      const onSourceUpdate = (file: string) => onSourceChange(file);
      const onTopologyChange = (file: string) => onSourceChange(file, true);
      server.watcher
        .on("change", onSourceUpdate)
        .on("add", onTopologyChange)
        .on("unlink", onTopologyChange);
      server.httpServer?.once("close", () => {
        clearTimeout(timer);
        server.watcher
          .off("change", onSourceUpdate)
          .off("add", onTopologyChange)
          .off("unlink", onTopologyChange);
      });
    },
  };
}

export function createAutoImportPlugins(): PluginOption[] {
  return [
    AutoImport({
      imports: [autoImportPackages],
      dirs: autoImportEntries,
      dts: false,
    }),
    createDeclarationPlugin(),
  ];
}
