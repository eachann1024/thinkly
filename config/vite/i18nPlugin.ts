import type { Plugin } from "vite";
import { transformMessages } from "../../scripts/i18n/compiler.mjs";
import { createCatalogSession } from "../../scripts/i18n/catalogSession.mjs";

export function createI18nPlugin(): Plugin {
  let root = process.cwd();
  let watching = false;
  let session: ReturnType<typeof createCatalogSession> | undefined;
  const refresh = (files: string[] | null = null) => {
    session ??= createCatalogSession(root);
    return session.refresh(files);
  };
  return {
    name: "goose-i18n",
    enforce: "pre",
    configResolved(config) { root = config.root; watching = config.command === "build" && Boolean(config.build.watch); },
    async buildStart() { await refresh(); },
    async closeBundle() { if (!watching) await session?.close(); },
    async closeWatcher() { await session?.close(); },
    async watchChange(file) { await refresh([file]); },
    transform(code, id) {
      const filename = id.split("?")[0];
      if (filename.includes("node_modules") || !/\.(?:[cm]?[jt]sx?|ya?ml)$/.test(filename)) return null;
      const result = transformMessages(code, filename);
      return result ? { code: result.code, map: result.map } : null;
    },
  };
}
