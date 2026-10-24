import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { blockHandleCoverageConfig, latestCoverageChecks } from "./lib/block-handle-coverage-config";

// EGO nodejs runs in a separate environment; pass the selected space/page/origin in source.
export default function run() {
  try {
    const prior = process.env.THINKLY_EGO_COVERAGE_SCOPE === "failed-sequence"
      ? latestCoverageChecks([
          "/tmp/thinkly-block-handles-coverage.json",
          "/tmp/thinkly-block-handles-coverage-sequence.json",
        ].filter(existsSync).map((path) => ({
          checks: JSON.parse(readFileSync(path, "utf8")).checks,
          modifiedAt: statSync(path).mtimeMs,
        }))) : [];
    const config = blockHandleCoverageConfig(process.env, prior);
    const proofPath = config.proofPath;
    rmSync(proofPath, { force: true });
    const input = `const verificationConfig = ${JSON.stringify(config)};\n` +
      readFileSync("scripts/verify/browser/block-handles-coverage-helpers.mjs", "utf8") + "\n" +
      readFileSync("scripts/verify/browser/block-handles-coverage.mjs", "utf8");
    const output = execFileSync("ego-browser", ["nodejs"], {
      input, encoding: "utf8", timeout: 240_000, maxBuffer: 3_000_000, env: process.env,
    });
    for (const line of output.split("\n")) if (/^[✓✗]/.test(line)) console.log(line);
    const proof = JSON.parse(readFileSync(proofPath, "utf8"));
    return proof.checks.length > 0 && proof.checks.every((check: any) => check.passed) ? 0 : 1;
  } catch (error: any) {
    console.log(`✗ EGO 全块把手覆盖验收未完成：${String(error.stdout || error.stderr || error.message).slice(-1800)}`);
    return 1;
  }
}
