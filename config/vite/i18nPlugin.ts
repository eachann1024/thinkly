import type { Plugin } from "vite";
import { transformMessages } from "../../scripts/i18n/compiler.mjs";
import { collectCatalog } from "../../scripts/i18n/catalog.mjs";

export function createI18nPlugin(): Plugin {
  let root = process.cwd();
  let development = false;
  let generation = Promise.resolve();
  const refresh = () => {
    generation = generation.catch(() => undefined).then(async () => {
      const { stale } = await collectCatalog(root, development);
      if (stale.length) throw new Error("i18n declarations are stale. Run node scripts/i18n/check.mjs --generate.");
    });
    return generation;
  };
  return {
    name: "goose-i18n",
    enforce: "pre",
    configResolved(config) { root = config.root; development = config.command === "serve"; },
    buildStart: refresh,
    async handleHotUpdate(context) {
      if (/\.(?:[jt]sx?|ya?ml)$/.test(context.file) && !context.file.endsWith(".d.ts")) await refresh();
    },
    transform(code, id) {
      const filename = id.split("?")[0];
      if (filename.includes("node_modules") || !/\.(?:[cm]?[jt]sx?|ya?ml)$/.test(filename)) return null;
      const result = transformMessages(code, filename);
      return result ? { code: result.code, map: result.map } : null;
    },
  };
}
