import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const source = dirname(fileURLToPath(import.meta.url));
if (!process.argv[2]) throw new Error("Specify an output directory for the standalone HTML files.");
const output = resolve(process.argv[2]);
if (output === source) throw new Error("The output directory must differ from the source directory.");
const read = (name) => readFile(resolve(source, name), "utf8");
const styleFiles = ["tokens.css", "layout.css", "table.css", "toolbar.css", "block-preview.css", "ai-chat.css"];
const scriptFiles = ["icons.js", "content.js", "prototype.js", "block-preview.js", "toolbar-model.js", "toolbar.js",
  "toolbar-popover.js", "toolbar-actions.js", "toolbar-assets.js", "selection.js",
  "ai-source.js", "ai-response.js", "ai-view.js", "ai-menu.js", "ai-chat.js", "controls.js"];
const [styles, scripts, license] = await Promise.all([
  Promise.all(styleFiles.map(read)),
  Promise.all(scriptFiles.map(read)),
  read("icons-LICENSE.txt"),
]);
const [css, js] = await Promise.all([
  transform(styles.join("\n"), { loader: "css", minify: true }),
  transform(scripts.join("\n"), { loader: "js", minify: true }),
]);
await mkdir(output, { recursive: true });
for (const name of ["theme-tint.html"]) {
  const template = await read(name);
  const html = template
    .replace(/  <link rel="stylesheet"[^>]+>\n/g, "")
    .replace(/  <script src="[^"]+" defer><\/script>\n/g, "")
    .replace("</head>", `<style>${css.code}</style>\n</head>`)
    .replace("</body>", `<script>${js.code.replace(/<\/script/gi, "<\\/script")}</script>\n</body>`);
  await writeFile(resolve(output, name), `<!-- Standalone preview. Icon license:\n${license}-->\n${html}`);
}
await writeFile(resolve(output, "README.md"), await read("README.md"));
console.log(`Standalone HTML written to ${output}`);
