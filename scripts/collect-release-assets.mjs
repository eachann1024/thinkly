import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "./desktop-release-support.mjs";

const sha = process.env.SOURCE_SHA;
const destination = resolve(ROOT, "artifacts");
mkdirSync(destination);
for (const prefix of ["source", "thinkly-win-x64", "thinkly-win-arm64", "thinkly-mac-arm64", "thinkly-mac-x64", "thinkly-linux-x64"]) {
  const source = resolve(ROOT, "downloaded-artifacts", `${prefix}-${sha}`);
  if (!existsSync(source) || !statSync(source).isDirectory()) throw new Error(`Missing artifact: ${source}`);
  for (const file of readdirSync(source)) {
    const from = resolve(source, file);
    if (!statSync(from).isFile()) throw new Error(`Unexpected directory: ${from}`);
    let name = file.replaceAll(" ", ".");
    if (["SHA256SUMS.txt", "BUILD.json", "COMMIT.txt"].includes(name)) name = `${prefix}-${name}`;
    const target = resolve(destination, name);
    if (existsSync(target) && !readFileSync(target).equals(readFileSync(from))) throw new Error(`Conflicting asset: ${name}`);
    copyFileSync(from, target);
  }
}
