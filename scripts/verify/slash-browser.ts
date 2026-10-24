import { execFileSync } from "node:child_process";
import path from "node:path";

export default function run() {
  const space = Number(process.env.SLASH_BROWSER_SPACE);
  if (!space) throw new Error("请设置 SLASH_BROWSER_SPACE 为现有 EGO TaskSpace ID");
  const options = {
    space,
    url: process.env.SLASH_BROWSER_URL ?? "http://127.0.0.1:6001/?caret-gallery=1&caret-menu=1",
    output: process.env.SLASH_BROWSER_OUTPUT ?? "/tmp/thinkly-slash-browser.json",
  };
  const file = path.join(process.cwd(), "scripts/verify/browser/slash.mjs");
  try {
    const output = execFileSync("ego-browser", ["nodejs"], {
      input: `globalThis.options=${JSON.stringify(options)}; await import(${JSON.stringify(`file://${file}`)});`,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    process.stdout.write(output);
    return /✗/.test(output) ? 1 : 0;
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    process.stdout.write(failure.stdout ?? "");
    process.stderr.write(failure.stderr ?? "");
    return 1;
  }
}
