import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Requires the development server and EGO. A supplied TaskSpace is kept open for debugging.
export default function run() {
  try {
    const output = execFileSync("ego-browser", ["nodejs"], {
      input: `const verificationConfig = ${JSON.stringify({ task: process.env.THINKLY_EGO_TASK, page: process.env.THINKLY_EGO_PAGE, origin: process.env.THINKLY_EGO_ORIGIN })};\n` + readFileSync("scripts/verify/browser/block-handles.mjs", "utf8"),
      encoding: "utf8", timeout: 120_000, maxBuffer: 2_000_000,
      env: process.env,
    });
    for (const line of output.split("\n")) if (/^[✓✗]/.test(line)) console.log(line);
    const proof = JSON.parse(readFileSync("/tmp/thinkly-block-handles-browser.json", "utf8"));
    return proof.checks.length > 0 && proof.checks.every((check: any) => check.passed) ? 0 : 1;
  } catch (error: any) {
    console.log(`✗ EGO 块交互验收未完成：${String(error.stdout || error.stderr || error.message).slice(-1800)}`);
    return 1;
  }
}
