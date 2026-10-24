import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";

// Independent performance scope: never reruns the full handle/menu acceptance.
export default function run() {
  const proofPath = "/tmp/thinkly-block-drag-perf.json";
  rmSync(proofPath, { force: true });
  try {
    const config = { task: process.env.THINKLY_EGO_TASK, page: process.env.THINKLY_EGO_PAGE, origin: process.env.THINKLY_EGO_ORIGIN };
    const input = `const verificationConfig = ${JSON.stringify(config)};\n` +
      readFileSync("scripts/verify/browser/block-handles-coverage-helpers.mjs", "utf8") + "\n" +
      readFileSync("scripts/verify/browser/block-drag-perf.mjs", "utf8");
    const output = execFileSync("ego-browser", ["nodejs"], { input, encoding: "utf8", timeout: 90_000, maxBuffer: 3_000_000, env: process.env });
    for (const line of output.split("\n")) if (/^[✓✗]/.test(line)) console.log(line);
    const proof = JSON.parse(readFileSync(proofPath, "utf8"));
    return proof.checks.length > 0 && proof.checks.every((item: any) => item.passed) ? 0 : 1;
  } catch (error: any) {
    console.log(`✗ EGO 持续原生拖动性能验收未完成：${String(error.stdout || error.stderr || error.message).slice(-1800)}`);
    return 1;
  }
}
