import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";

export default function run() {
  const types = process.env.THINKLY_EGO_CONVERSION_TYPES?.split(",").filter(Boolean);
  const proofPath = types?.length ? "/tmp/thinkly-block-conversion-browser-partial.json" : "/tmp/thinkly-block-conversion-browser.json";
  rmSync(proofPath, { force: true });
  const config = { task: process.env.THINKLY_EGO_TASK, origin: process.env.THINKLY_EGO_ORIGIN, proofPath, types };
  try {
    const input = `const verificationConfig = ${JSON.stringify(config)};\n` +
      readFileSync("scripts/verify/browser/block-handles-coverage-helpers.mjs", "utf8") + "\n" +
      readFileSync("scripts/verify/browser/block-conversion.mjs", "utf8");
    const output = execFileSync("ego-browser", ["nodejs"], { input, encoding: "utf8", timeout: 180_000, maxBuffer: 1_000_000 });
    for (const line of output.split("\n")) if (/^[✓✗]/.test(line)) console.log(line);
    const proof = JSON.parse(readFileSync(proofPath, "utf8"));
    return proof.checks.length > 0 && proof.checks.every((item: any) => item.passed) ? 0 : 1;
  } catch (error: any) {
    console.log(`✗ 转换菜单浏览器验收未完成：${String(error.stdout || error.stderr || error.message).slice(-1600)}`);
    return 1;
  }
}
