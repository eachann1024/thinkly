import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyReleasePlan } from "./desktop-auto-release.mjs";
import { ROOT } from "./desktop-release-support.mjs";

const planPath = resolve(ROOT, process.argv[2] || "release-plan.json");
assert.ok(existsSync(planPath), `missing release plan: ${planPath}`);
const plan = JSON.parse(readFileSync(planPath, "utf8"));
applyReleasePlan(ROOT, plan);
console.log(`Applied release plan version=${plan.version} autoBump=${Boolean(plan.autoBump)}`);
