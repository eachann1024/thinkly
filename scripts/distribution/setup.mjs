import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { distributionConfig } from "./config.mjs";

if (distributionConfig()) {
  execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", [
    "ci", "--prefix", fileURLToPath(new URL(".", import.meta.url)),
    "--ignore-scripts", "--no-audit", "--no-fund",
  ], { stdio: "inherit" });
} else {
  console.log("Domestic distribution is not enabled; the GitHub publication is unchanged.");
}
